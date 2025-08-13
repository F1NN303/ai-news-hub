const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { signJWT } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { email, password, remember } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    // TODO: replace with real DB lookup
    const { rows } = await db.query(
      'SELECT id, name, email, password_hash, role, email_verified FROM users WHERE email=$1',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash || '');
    if (!valid) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    if (!user.email_verified) {
      return res
        .status(403)
        .json({ error: 'email_not_verified', message: 'Please verify your email before logging in.' });
    }

    const jwt = await signJWT(
      { sub: String(user.id), email: user.email, name: user.name, role: user.role },
      remember ? '7d' : '1d'
    );
    const signed = signSessionToken(jwt);
    const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 24;
    res.setHeader(
      'Set-Cookie',
      `session=${signed}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
    );
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('/api/auth/login error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

