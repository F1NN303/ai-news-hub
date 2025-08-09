const { verifyToken } = require('./auth');
const { getSessionToken } = require('./cookies');
const db = require('./db');

module.exports = async function requireAdmin(req, res) {
  const token = getSessionToken(req);
  const payload = token && await verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  const { sub } = payload;
  const { rows } = await db.query('SELECT role FROM users WHERE id = $1', [sub]);
  const role = rows[0] && rows[0].role;
  if (role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  req.user = { id: sub, role };
  return req.user;
};
