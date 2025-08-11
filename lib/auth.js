const { createRemoteJWKSet, jwtVerify, SignJWT } = require('jose');

// Expose OAuth availability to the frontend at build time
process.env.NEXT_PUBLIC_HAS_OAUTH = process.env.STACK_AUTH_CLIENT_ID ? 'true' : 'false';

// Backward-compat default. New code should pass explicit keys.
const REQUIRED_KEYS = [
  'DATABASE_URL',
  'STACK_AUTH_PROJECT_ID',
  'STACK_AUTH_CLIENT_ID',
  'STACK_AUTH_CLIENT_SECRET',
  'SESSION_SECRET',
];

class ConfigError extends Error {
  constructor(missing) {
    super(`Missing environment variables: ${missing.join(', ')}`);
    this.code = 'CONFIG_ERROR';
  }
}

function ensureConfig(required = REQUIRED_KEYS) {
  const keys = required && required.length ? [...required] : REQUIRED_KEYS;
  const missing = [];

  // Special case: allow JWKS_URL or JWT_SECRET
  if (keys.includes('JWKS_URL') && keys.includes('JWT_SECRET')) {
    if (!process.env.JWKS_URL && !process.env.JWT_SECRET) {
      missing.push('JWKS_URL or JWT_SECRET');
    }
    // Remove them from individual checks
    keys.splice(keys.indexOf('JWKS_URL'), 1);
    keys.splice(keys.indexOf('JWT_SECRET'), 1);
  }

  for (const k of keys) {
    if (!process.env[k]) missing.push(k);
  }

  if (missing.length) {
    throw new ConfigError(missing);
  }
  return true;
}

const JWKS_URL = process.env.JWKS_URL;
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
