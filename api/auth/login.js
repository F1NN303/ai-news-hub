const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const { signJWT } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'missing_credentials' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
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
    res.setHeader(
      'Set-Cookie',
      `session=${signed}; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`
    );
    return res.status(200).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('/api/auth/login error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
