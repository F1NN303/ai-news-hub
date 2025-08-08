const db = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { rows } = await db.query(
        'SELECT * FROM posts ORDER BY published_at DESC LIMIT 50'
      );
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { title, excerpt, content, category, tags, cover_image, author } = body;
      const { rows } = await db.query(
        `INSERT INTO posts (title, excerpt, content, category, tags, cover_image, author)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [title, excerpt || null, content || null, category || null, tags || null, cover_image || null, author || 'Admin']
      );
      return res.status(201).json(rows[0]);
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('/api/posts error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
