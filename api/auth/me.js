const { ensureConfig, verifySessionToken } = require('../../lib/auth');
const { getSessionToken } = require('../../lib/cookies');
const db = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  try {
    ensureConfig();
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const payload = await verifySessionToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { userId } = payload;
    const { rows } = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('/api/auth/me error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
