const { ensureConfig } = require('../../lib/auth');

module.exports = (req, res) => {
  try {
    ensureConfig(['SESSION_SECRET']);
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
    res.writeHead(302, { Location: '/' }).end();
  } catch (err) {
    console.error('/api/auth/logout error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
