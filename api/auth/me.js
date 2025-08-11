const { verifyToken, ensureConfig } = require('../../lib/auth');
const { getSessionToken } = require('../../lib/cookies');
const db = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    ensureConfig(['JWKS_URL', 'JWT_SECRET']);
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { sub } = payload;
    const { rows } = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [sub]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'not_found' });
    }
    const user = rows[0];
    return res.status(200).json(user);
  } catch (err) {
    console.error('/api/auth/me error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
