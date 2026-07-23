const jwt = require('jsonwebtoken');
const {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
  getJwtSecret,
} = require('../utils/securityConfig');

function requireAuth(req, res, next) {
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

module.exports = { requireAuth };
