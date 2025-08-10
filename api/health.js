const { ensureConfig } = require('../lib/auth');

module.exports = (req, res) => {
  try {
    ensureConfig();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('/api/health error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
