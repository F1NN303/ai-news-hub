const { createRemoteJWKSet, jwtVerify } = require('jose');

const STACK_AUTH_BASE_URL = process.env.STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
const PROJECT_ID = process.env.STACK_AUTH_PROJECT_ID;
const JWKS_URL = process.env.JWKS_URL;
const JWT_SECRET = process.env.JWT_SECRET;

let jwks;
let secret;

async function getKey() {
  if (JWT_SECRET) {
    if (!secret) {
      secret = new TextEncoder().encode(JWT_SECRET);
    }
    return secret;
  }

  if (!jwks) {
    let url;
    if (JWKS_URL) {
      url = JWKS_URL;
    } else {
      if (!PROJECT_ID) {
        throw new Error('STACK_AUTH_PROJECT_ID is not set');
      }
      url = `${STACK_AUTH_BASE_URL}/api/v1/projects/${PROJECT_ID}/.well-known/jwks.json`;
    }
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

async function verifyToken(token) {
  if (!token) return null;
  try {
    const key = await getKey();
    const { payload } = await jwtVerify(token, key);
    return payload;
  } catch (err) {
    console.error('verifyToken error:', err.message);
    return null;
  }
}

module.exports = { verifyToken };
