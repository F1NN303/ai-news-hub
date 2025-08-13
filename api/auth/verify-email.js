const db = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) {
      return res.status(400).send('Invalid token');
    }
    const { rows } = await db.query(
      'SELECT id FROM users WHERE email_verification_token=$1',
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).send('Invalid token');
    }
    const id = rows[0].id;
    await db.query(
      'UPDATE users SET email_verified=true, email_verification_token=NULL WHERE id=$1',
      [id]
    );
    res.writeHead(302, { Location: '/login?verified=1' }).end();
  } catch (err) {
    console.error('/api/auth/verify-email error:', err);
    return res.status(500).send('Server error');
  }
};
