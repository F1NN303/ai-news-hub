const db = require('../../lib/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../../lib/email');

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
    const token = crypto.randomBytes(32).toString('hex');
    await db.query(
      'INSERT INTO users(name, email, password_hash, role, email_verification_token) VALUES($1,$2,$3,$4,$5)',
      [name, email, hash, 'user', token]
    );
    await sendVerificationEmail(email, token);

    return res
      .status(201)
      .json({ message: 'User created. Please check your email to verify your account.' });
  } catch (err) {
    console.error('/api/auth/signup error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

