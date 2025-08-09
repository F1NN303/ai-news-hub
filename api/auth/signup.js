const db = require('../../lib/db');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users(name, email, password_hash, role) VALUES($1,$2,$3,$4) RETURNING id, name, email, role',
      [name, email, hash, 'user']
    );
    const user = rows[0];
    return res.status(201).json(user);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'user_exists' });
    }
    console.error('/api/auth/signup error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
