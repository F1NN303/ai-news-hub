const { query } = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, slug, image_url
         FROM public.posts
        ORDER BY id DESC`
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'DB_ERROR' });
  }
};
