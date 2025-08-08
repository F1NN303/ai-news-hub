const db = require('../../db');

module.exports = async (req, res) => {
  res.setHeader('Content-Type','application/json');
  const { id } = req.query || {};
  if (!db.hasDb()) return res.status(404).end(JSON.stringify({ error: 'Not found' }));
  try {
    let row;
    if (/^\d+$/.test(id)) {
      row = (await db.query(`SELECT * FROM posts WHERE id=$1`, [Number(id)])).rows[0];
    } else {
      row = (await db.query(`SELECT * FROM posts WHERE slug=$1`, [id])).rows[0];
    }
    if (!row) return res.status(404).end(JSON.stringify({ error: 'Not found' }));
    res.status(200).end(JSON.stringify(row));
  } catch (e) {
    console.error(e); res.status(500).end(JSON.stringify({ error: 'Server error' }));
  }
};
