const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Token bulunamadı.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      console.error("CRITICAL: JWT_SECRET ortam değişkeni ayarlanmamış!");
      return res.status(500).json({ error: 'Sunucu yapılandırma hatası.' });
    }
    const decoded = jwt.verify(token, secret || 'super-secret-key');
    req.user = decoded; // { email, role vb. }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

module.exports = { requireAuth };
