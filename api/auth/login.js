const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { signJWT } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');
const { ensureCsrf, validateCsrf } = require('../../lib/csrf');

// simple in-memory rate limiter
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getKey(prefix, value) {
  return `${prefix}:${value}`;
}

function isLimited(ip, email) {
  const now = Date.now();
  const keys = [getKey('ip', ip), getKey('email', email)];
  for (const k of keys) {
    const entry = attempts.get(k);
    if (entry && now < entry.expires && entry.count >= MAX_ATTEMPTS) {
      return true;
    }
  }
  return false;
}

function recordFailure(ip, email) {
  const now = Date.now();
  const keys = [getKey('ip', ip), getKey('email', email)];
  for (const k of keys) {
    const entry = attempts.get(k);
    if (!entry || now > entry.expires) {
      attempts.set(k, { count: 1, expires: now + WINDOW_MS });
    } else {
      entry.count++;
    }
  }
}

function clearAttempts(ip, email) {
  attempts.delete(getKey('ip', ip));
  attempts.delete(getKey('email', email));
}

module.exports = async (req, res) => {
  ensureCsrf(req, res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!validateCsrf(req)) {
    return res.status(403).json({ error: 'invalid_csrf_token' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '';
  if (isLimited(ip, email)) {
    return res.status(429).json({ error: 'too_many_attempts' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      recordFailure(ip, email);
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailure(ip, email);
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const token = await signJWT({
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });
    const maxAge = 3600;
    const signed = signSessionToken(token);
    const cookie = `session=${signed}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
    const existing = res.getHeader && res.getHeader('Set-Cookie');
    if (existing) {
      if (Array.isArray(existing)) {
        res.setHeader('Set-Cookie', [...existing, cookie]);
      } else {
        res.setHeader('Set-Cookie', [existing, cookie]);
      }
    } else {
      res.setHeader('Set-Cookie', cookie);
    }
    clearAttempts(ip, email);
    return res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('/api/auth/login error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
