/**
 * Auth Middleware Integration Testleri
 *
 * Hedef: JWT doğrulama, kimlik alanları, issuer/audience ve edge case'leri doğrular.
 */
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../middlewares/auth');
const {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
} = require('../../utils/securityConfig');

function createMockReqRes(authHeader = null) {
  const req = { headers: {} };
  if (authHeader !== null) req.headers.authorization = authHeader;

  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  return { req, res, next: jest.fn() };
}

const TEST_SECRET = 'test-jwt-secret';

function signValidToken(payload, options = {}) {
  return jwt.sign(payload, options.secret || TEST_SECRET, {
    algorithm: JWT_ALGORITHM,
    issuer: options.issuer || JWT_ISSUER,
    audience: options.audience || JWT_AUDIENCE,
    subject: payload.id,
    expiresIn: options.expiresIn || '1h',
  });
}

describe('Auth Middleware', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  test('Authorization header yoksa 401 dönmeli', () => {
    const { req, res, next } = createMockReqRes();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Token bulunamadı');
    expect(next).not.toHaveBeenCalled();
  });

  test('Bearer prefix yoksa 401 dönmeli', () => {
    const { req, res, next } = createMockReqRes('InvalidToken xyz');
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('boş Bearer token 401 dönmeli', () => {
    const { req, res, next } = createMockReqRes('Bearer ');
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('geçersiz JWT token 401 dönmeli', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid.token.here');
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Geçersiz');
    expect(next).not.toHaveBeenCalled();
  });

  test('süresi dolmuş token 401 dönmeli', () => {
    const expiredToken = signValidToken(
      { id: 'user-expired', email: 'test@test.com', role: 'ADMIN' },
      { expiresIn: '-1s' },
    );
    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('geçerli ADMIN token ile güvenilir req.user oluşturmalı', async () => {
    const validToken = signValidToken({
      id: 'admin-user-id',
      email: 'admin@test.com',
      role: 'ADMIN',
    });
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({
      id: 'admin-user-id',
      email: 'admin@test.com',
      role: 'ADMIN',
    });
  });

  test('geçerli CUSTOMER token ile next çağrılmalı', async () => {
    const validToken = signValidToken({
      id: 'customer-user-id',
      email: 'customer@test.com',
      role: 'CUSTOMER',
    });
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe('CUSTOMER');
  });

  test('farklı secret ile imzalanmış token reddedilmeli', () => {
    const wrongToken = signValidToken(
      { id: 'attacker-id', email: 'hacker@test.com', role: 'ADMIN' },
      { secret: 'wrong-secret' },
    );
    const { req, res, next } = createMockReqRes(`Bearer ${wrongToken}`);
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('yanlış issuer içeren token reddedilmeli', () => {
    const wrongIssuerToken = signValidToken(
      { id: 'user-id', email: 'user@test.com', role: 'CUSTOMER' },
      { issuer: 'another-app' },
    );
    const { req, res, next } = createMockReqRes(`Bearer ${wrongIssuerToken}`);
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('yanlış audience içeren token reddedilmeli', () => {
    const wrongAudienceToken = signValidToken(
      { id: 'user-id', email: 'user@test.com', role: 'CUSTOMER' },
      { audience: 'another-client' },
    );
    const { req, res, next } = createMockReqRes(`Bearer ${wrongAudienceToken}`);
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('id alanı olmayan token reddedilmeli', () => {
    const tokenWithoutId = jwt.sign(
      { email: 'user@test.com', role: 'CUSTOMER' },
      TEST_SECRET,
      {
        algorithm: JWT_ALGORITHM,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: '1h',
      },
    );
    const { req, res, next } = createMockReqRes(`Bearer ${tokenWithoutId}`);
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('kimlik');
    expect(next).not.toHaveBeenCalled();
  });
});
