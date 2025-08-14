const requireUser = require('./requireUser');

module.exports = async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (user.role !== 'admin' && !roles.includes('admin')) {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return user;
};
