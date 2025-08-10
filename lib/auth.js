const { SignJWT, jwtVerify } = require('jose');
const db = require('./db');

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_STACK_PROJECT_ID',
  'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
  'STACK_AUTH_SECRET',
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

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
let sessionKey;
function getSessionKey() {
  if (!sessionKey) {
    if (!SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
    sessionKey = new TextEncoder().encode(SESSION_SECRET);
  }
  return sessionKey;
}

async function setSessionCookie(res, payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionKey());
  const cookie = `session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
  const prev = res.getHeader && res.getHeader('Set-Cookie');
  if (prev) {
    if (Array.isArray(prev)) {
      res.setHeader('Set-Cookie', [...prev, cookie]);
    } else {
      res.setHeader('Set-Cookie', [prev, cookie]);
    }
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
  return cookie;
}

async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSessionKey());
    return payload;
  } catch {
    return null;
  }
}

async function upsertUserByOidc({ sub, email, name }) {
  const id = parseInt(sub, 10);
  if (Number.isNaN(id)) throw new Error('invalid_sub');
  const { rows } = await db.query(
    `INSERT INTO users(id, name, email, password_hash, role)
       VALUES($1,$2,$3,'',$4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
       RETURNING id, role`,
    [id, name || '', email || '', 'user']
  );
  return rows[0];
}

module.exports = {
  ensureConfig,
  setSessionCookie,
  upsertUserByOidc,
  verifySessionToken,
};
