const { getSession } = require('@auth0/nextjs-auth0');

module.exports = async function requireUser(req, res) {
  const session = getSession(req, res);
  if (!session || !session.user) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  req.user = session.user;
  return req.user;
};
