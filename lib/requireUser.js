const { getServerSession } = require('next-auth/next');
const { authOptions } = require('../api/auth/[...nextauth]');

module.exports = async function requireUser(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  req.user = { id: Number(session.user.id), name: session.user.name, role: session.user.role };
  return req.user;
};
