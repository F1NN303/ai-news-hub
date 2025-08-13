const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { signJWT } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { name = '', email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const { rows: existing } = await db.query('SELECT 1 FROM users WHERE email=$1', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'user_exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    // TODO: adjust insert query to match actual schema
    const { rows } = await db.query(
      'INSERT INTO users(name, email, password_hash, role) VALUES($1,$2,$3,$4) RETURNING id, name, email, role',
      [name, email, hash, 'user']
    );
    const user = rows[0];

    const jwt = await signJWT({ sub: String(user.id), email: user.email, name: user.name, role: user.role }, '7d');
    const signed = signSessionToken(jwt);
    res.setHeader(
      'Set-Cookie',
      `session=${signed}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${60 * 60 * 24 * 7}`
    );

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('/api/auth/signup error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

