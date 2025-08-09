const { createRemoteJWKSet, jwtVerify, SignJWT } = require('jose');

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

module.exports = { verifyToken, signJWT };
