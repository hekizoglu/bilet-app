const jwt = require('jsonwebtoken');

const generateToken = (user, extraPayload = {}, options = { expiresIn: '12h' }) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: 1,
    ...extraPayload
  };

  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    console.error("CRITICAL: JWT_SECRET ortam değişkeni ayarlanmamış!");
    throw new Error('Sunucu yapılandırma hatası.');
  }

  return jwt.sign(
    payload,
    secret || 'super-secret-key',
    options
  );
};

module.exports = {
  generateToken
};
