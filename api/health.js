const db = require('./db');
module.exports = async (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({
    ok: true,
    db: db.hasDb() ? 'configured' : 'not_configured',
    time: new Date().toISOString()
  }));
};
