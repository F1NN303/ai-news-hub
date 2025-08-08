const { query } = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    const { id } = req.query;
    const sql = `
      SELECT id, title, slug, image_url, content, excerpt, author
        FROM public.posts
       WHERE slug = $1 OR id::text = $1
       LIMIT 1
    `;
    const { rows } = await query(sql, [id]);
    if (!rows.length) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'DB_ERROR' });
  }
};

