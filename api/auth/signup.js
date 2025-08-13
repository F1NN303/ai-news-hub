const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../../lib/email');
const prisma = require('../../lib/prisma');

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
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'user_exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        role: 'user',
        emailVerificationToken: token,
      },
    });
    await sendVerificationEmail(email, token);

    return res
      .status(201)
      .json({ message: 'User created. Please check your email to verify your account.' });
  } catch (err) {
    console.error('/api/auth/signup error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
