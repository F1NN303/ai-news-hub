const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { ensureCsrf, validateCsrf } = require('../../lib/csrf');
const { createRateLimiter } = require('../../lib/rateLimit');
const { ensureConfig } = require('../../lib/auth');

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });

module.exports = async (req, res) => {
  try {
    ensureConfig(['DATABASE_URL']);
    ensureCsrf(req, res);
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'method_not_allowed' });
    }

    if (!validateCsrf(req)) {
      return res.status(403).json({ error: 'invalid_csrf_token' });
    }

    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '';
    if (limiter.isLimited(ip, email)) {
      return res.status(429).json({ error: 'too_many_attempts' });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await db.query(
        'INSERT INTO users(name, email, password_hash, role) VALUES($1,$2,$3,$4) RETURNING id, name, email, role',
        [name, email, hash, 'user']
      );
      const user = rows[0];
      limiter.clear(ip, email);
      return res.status(201).json(user);
    } catch (err) {
      if (err.code === '23505') {
        limiter.recordFailure(ip, email);
        return res.status(409).json({ error: 'user_exists' });
      }
      limiter.recordFailure(ip, email);
      console.error('/api/auth/signup error:', err);
      return res.status(500).json({ error: 'SERVER_ERROR' });
    }
  } catch (err) {
    console.error('/api/auth/signup error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
