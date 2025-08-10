const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { signJWT, ensureConfig } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');
const { ensureCsrf, validateCsrf } = require('../../lib/csrf');
const { createRateLimiter } = require('../../lib/rateLimit');

const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });

module.exports = async (req, res) => {
  try {
    ensureConfig();
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
    if (limiter.isLimited(ip, email)) {
      return res.status(429).json({ error: 'too_many_attempts' });
    }

    const { rows } = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      limiter.recordFailure(ip, email);
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      limiter.recordFailure(ip, email);
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
    limiter.clear(ip, email);
    return res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('/api/auth/login error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
