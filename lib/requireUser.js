const { verifySessionToken } = require('./auth');
const { getSessionToken } = require('./cookies');
const db = require('./db');

module.exports = async function requireUser(req, res) {
  const token = getSessionToken(req);
  const payload = token && await verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  const { userId } = payload;
  const { rows } = await db.query('SELECT id, name FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  req.user = { id: user.id, name: user.name };
  return req.user;
};
