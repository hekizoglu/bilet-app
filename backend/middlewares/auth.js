const jwt = require('jsonwebtoken');
const {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
  getJwtSecret,
} = require('../utils/securityConfig');

// tokenVersion doğrulaması için 60 sn TTL'li küçük önbellek (her istekte DB sorgusunu önler)
const versionCache = new Map();
const VERSION_CACHE_TTL = 60 * 1000;

async function getCurrentTokenVersion(userId) {
  const cached = versionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.version;
  }
  try {
    const prisma = require('../prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokenVersion: true },
    });
    const version = user?.tokenVersion ?? 1;
    versionCache.set(userId, { version, expiresAt: Date.now() + VERSION_CACHE_TTL });
    return version;
  } catch (e) {
    // DB hatası: doğrulamayı atla (mevcut davranış) — giriş engellenmesin
    console.error('tokenVersion sorgu hatası:', e.message);
    return null;
  }
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Token bulunamadı.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Token bulunamadı.' });
  }

  let secret;
  try {
    secret = getJwtSecret();
  } catch (configError) {
    console.error('CRITICAL AUTH CONFIG ERROR:', configError.message);
    return res.status(500).json({ error: 'Sunucu güvenlik yapılandırması eksik.' });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (!decoded.id || !decoded.email || !decoded.role || decoded.sub !== decoded.id) {
      return res.status(401).json({ error: 'Token kimlik bilgileri eksik veya geçersiz.' });
    }

    // TOKEN REVİZYONU: tokenVersion eşleşmezse token geçersiz sayılır.
    // Rol değişimi/şifre sıfırlama sonrası eski token'lar anında ölür.
    const currentVersion = await getCurrentTokenVersion(decoded.id);
    if (currentVersion !== null && (decoded.tokenVersion ?? 1) !== currentVersion) {
      return res.status(401).json({ error: 'Oturum süresi doldu, lütfen tekrar giriş yapın.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

/** Rol/şifre değişiminde çağrılır: o kullanıcının tokenVersion cache'ini geçersiz kılar */
function invalidateTokenVersionCache(userId) {
  versionCache.delete(userId);
}

module.exports = { requireAuth, invalidateTokenVersionCache };
