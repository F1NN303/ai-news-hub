
const { query } = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { rows } = await query(
        'SELECT id, title, slug, image_url FROM public.posts ORDER BY id DESC'
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { title, slug, excerpt, content, category, tags, author, image_url } = req.body || {};
      const { rows } = await query(
        `INSERT INTO public.posts (title, slug, excerpt, content, category, tags, author, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, title, slug, image_url`,
        [title, slug, excerpt, content, category, tags, author, image_url]
      );
      return res.status(201).json(rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'DB_ERROR', detail: e.message });
  }
};
