const JWT_ISSUER = 'bilet-app';
const JWT_AUDIENCE = 'bilet-app-web';
const JWT_ALGORITHM = 'HS256';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (process.env.NODE_ENV === 'test' && secret) {
    return secret;
  }

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET en az 32 karakter olmalı ve ortam değişkeni olarak tanımlanmalıdır.');
  }

  return secret;
}

function isLocalAuthEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_LOCAL_AUTH === 'true';
}

module.exports = {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_ALGORITHM,
  getJwtSecret,
  isLocalAuthEnabled,
};
