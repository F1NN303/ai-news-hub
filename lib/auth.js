const { createRemoteJWKSet, jwtVerify, SignJWT } = require('jose');

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'STACK_SECRET_KEY',
  'JWT_SECRET',
  'SESSION_SECRET',
  'DATABASE_URL',
];

class ConfigError extends Error {
  constructor(missing) {
    super(`Missing environment variables: ${missing.join(', ')}`);
    this.code = 'CONFIG_ERROR';
  }
}

const missingKeys = REQUIRED_KEYS.filter((k) => !process.env[k]);
if (missingKeys.length) {
  console.warn(`Missing environment variables: ${missingKeys.join(', ')}`);
}

function ensureConfig() {
  if (missingKeys.length) {
    throw new ConfigError(missingKeys);
  }
  return true;
}

const STACK_PROJECT_ID = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
const JWKS_URL =
  process.env.JWKS_URL ||
  (STACK_PROJECT_ID
    ? `https://api.stack-auth.com/api/v1/projects/${STACK_PROJECT_ID}/.well-known/jwks.json`
    : undefined);
const JWT_SECRET = process.env.JWT_SECRET;

let jwks;
let secret;

async function getSecret() {
  if (!secret) {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');
    secret = new TextEncoder().encode(JWT_SECRET);
  }
  return secret;
}

async function getJwks() {
  if (!jwks) {
    if (!JWKS_URL) throw new Error('JWKS_URL is not set');
    jwks = createRemoteJWKSet(new URL(JWKS_URL));
  }
  return jwks;
}

async function verifyToken(token) {
  if (!token) return null;
  if (JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(token, await getSecret());
      return payload;
    } catch (err) {
      // ignore and try JWKS
    }
  }
  if (JWKS_URL) {
    try {
      const { payload } = await jwtVerify(token, await getJwks());
      return payload;
    } catch (err) {
      console.error('verifyToken error:', err.message);
      return null;
    }
  }
  return null;
}

async function signJWT(payload, expiresIn = '1h') {
  const key = await getSecret();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

module.exports = { verifyToken, signJWT, ensureConfig };
