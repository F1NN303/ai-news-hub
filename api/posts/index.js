// api/posts/index.js
const { query } = require('../../lib/db');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const { rows } = await query(`
        SELECT id, title, slug, excerpt, content, category, tags, author, hero_image, published_at
        FROM public.posts
        ORDER BY id DESC
      `);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const {
        title, slug,
        excerpt = '',
        content = '',
        category = 'AI Industry',
        tags = [],
        author = 'AI News Hub',
        hero_image = null,
        published_at = null
      } = req.body || {};

      if (!title || !slug) {
        return res.status(400).json({ error: 'title and slug are required' });
      }

      const { rows } = await query(`
        INSERT INTO public.posts (title, slug, excerpt, content, category, tags, author, hero_image, published_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, now()))
        ON CONFLICT (slug) DO UPDATE SET
          title=EXCLUDED.title,
          excerpt=EXCLUDED.excerpt,
          content=EXCLUDED.content,
          category=EXCLUDED.category,
          tags=EXCLUDED.tags,
          author=EXCLUDED.author,
          hero_image=EXCLUDED.hero_image,
          published_at=EXCLUDED.published_at
        RETURNING *
      `, [title, slug, excerpt, content, category, tags, author, hero_image, published_at]);

      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
