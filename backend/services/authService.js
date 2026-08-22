const jwt = require('jsonwebtoken');

const { JWT_ISSUER, JWT_AUDIENCE, JWT_ALGORITHM, getJwtSecret } = require('../utils/securityConfig');

const generateToken = (user, extraPayload = {}, options = { expiresIn: '12h' }) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion ?? 1,
    ...extraPayload
  };

  const secret = getJwtSecret();

  return jwt.sign(
    payload,
    secret,
    {
      ...options,
      algorithm: JWT_ALGORITHM,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: String(user.id)
    }
  );
};

module.exports = {
  generateToken
};
