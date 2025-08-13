const { getServerSession } = require('next-auth/next');
const { authOptions } = require('./[...nextauth]');

module.exports = async (req, res) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const user = session.user;
  return res.status(200).json({ id: Number(user.id), name: user.name, email: user.email, role: user.role });
};
