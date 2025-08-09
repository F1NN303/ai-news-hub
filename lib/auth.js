const { createRemoteJWKSet, jwtVerify } = require('jose');

const STACK_AUTH_BASE_URL = process.env.STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';
const PROJECT_ID = process.env.STACK_AUTH_PROJECT_ID;

let jwks;

async function getJWKS() {
  if (!jwks) {
    if (!PROJECT_ID) {
      throw new Error('STACK_AUTH_PROJECT_ID is not set');
    }
    const url = `${STACK_AUTH_BASE_URL}/api/v1/projects/${PROJECT_ID}/.well-known/jwks.json`;
    jwks = createRemoteJWKSet(new URL(url));
  }
  return jwks;
}

async function verifyToken(token) {
  if (!token) return null;
  try {
    const JWKS = await getJWKS();
    const { payload } = await jwtVerify(token, JWKS);
    return payload;
  } catch (err) {
    console.error('verifyToken error:', err.message);
    return null;
  }
}

module.exports = { verifyToken };
