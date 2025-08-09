const { verifyToken } = require('../../lib/auth');
const { getSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  try {
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ error: 'unauthorized' });
    }
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
