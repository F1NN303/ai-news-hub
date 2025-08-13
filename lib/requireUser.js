const { getSession } = require('@auth0/nextjs-auth0');

module.exports = async function requireUser(req, res) {
  const session = getSession(req, res);
  if (!session || !session.user) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  const { sub, name, email, role } = session.user;
  const id = sub || session.user.id;
  req.user = { id, name, email, role };
  return req.user;
};
