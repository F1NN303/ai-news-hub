const db = require('../../../lib/db');
const requireAdmin = require('../../../lib/requireAdmin');
const { ensureConfig } = require('../../../lib/auth');

module.exports = async (req, res) => {
  try {
    ensureConfig();
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === 'GET') {
      const { rows } = await db.query('SELECT id, name, email, role FROM users ORDER BY id');
      return res.status(200).json(rows);
    }
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('/api/admin/users error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
