const { verifyToken } = require('../../lib/auth');

module.exports = async (req, res) => {
  try {
    const cookie = req.headers?.cookie || '';
    const session = cookie.split(';').find(c => c.trim().startsWith('session='));
    if (!session) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const token = session.split('=')[1];
    const payload = await verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const { sub, email, name } = payload;
    return res.status(200).json({ sub, email, name });
  } catch (err) {
    console.error('/api/auth/me error:', err); 
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
