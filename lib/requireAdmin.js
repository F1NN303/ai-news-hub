const requireUser = require('./requireUser');

module.exports = async function requireAdmin(req, res) {
  await requireUser(req, res);
  if (!req.user) return null;
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return req.user;
};
