// pages/api/auth/verify.js
const db = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { token } = req.query || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'missing_token' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE users
         SET email_verified = TRUE,
             email_verification_token = NULL
       WHERE email_verification_token = $1
       RETURNING id, email, email_verified`,
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'invalid_or_used_token' });
    }

    // Fertig → zurück zur Startseite oder Login mit Hinweis
    res.writeHead(302, { Location: '/?verified=1' });
    res.end();
  } catch (err) {
    console.error('/api/auth/verify error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
