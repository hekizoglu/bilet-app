/**
 * Auth Middleware Integration Testleri
 * 
 * Hedef: JWT doğrulama, yetki kontrolü ve edge case'leri doğrular.
 */
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../../middlewares/auth');

// Mock response/request nesneleri oluşturucu
function createMockReqRes(authHeader = null) {
  const req = {
    headers: {}
  };
  if (authHeader !== null) {
    req.headers.authorization = authHeader;
  }

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
    }
  };

  const next = jest.fn();
  return { req, res, next };
}

const TEST_SECRET = 'test-jwt-secret';

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

  test('geçersiz JWT token 401 dönmeli', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid.token.here');

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toContain('Geçersiz');
    expect(next).not.toHaveBeenCalled();
  });

  test('süresi dolmuş token 401 dönmeli', () => {
    // 1 saniye önce expire olan token
    const expiredToken = jwt.sign(
      { email: 'test@test.com', role: 'ADMIN' },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);

    requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('geçerli ADMIN token ile next() çağrılmalı', () => {
    const validToken = jwt.sign(
      { email: 'admin@test.com', role: 'ADMIN' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('admin@test.com');
    expect(req.user.role).toBe('ADMIN');
  });

  test('geçerli CUSTOMER token ile next() çağrılmalı', () => {
    const validToken = jwt.sign(
      { email: 'customer@test.com', role: 'CUSTOMER' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('CUSTOMER');
  });

  test('farklı secret ile imzalanmış token reddedilmeli', () => {
    const wrongToken = jwt.sign(
      { email: 'hacker@test.com', role: 'ADMIN' },
      'wrong-secret',
      { expiresIn: '1h' }
    );
    const { req, res, next } = createMockReqRes(`Bearer ${wrongToken}`);

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
});
