// api/posts/index.js
const { query } = require('../../lib/db');
const requireAdmin = require('../../lib/requireAdmin');
const requireUser = require('../../lib/requireUser');
const { ensureCsrf, validateCsrf } = require('../../lib/csrf');
const { ensureConfig } = require('../../lib/auth');

module.exports = async (req, res) => {
  try {
    ensureCsrf(req, res);
    if (req.method === 'GET') {
      ensureConfig(['DATABASE_URL']);
      const { rows } = await query(`
        SELECT id, title, slug, excerpt, content, category, tags, author, image_url, published_at
        FROM public.posts
        ORDER BY id DESC
      `);
      let user = null;
      if (req.headers?.authorization) {
        user = await requireUser(req, res);
        if (!user) return;
      }
      return res.status(200).json({ posts: rows, user });
    }

    if (req.method === 'POST') {
      ensureConfig();
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      if (!validateCsrf(req)) {
        return res.status(403).json({ error: 'invalid_csrf_token' });
      }

      const {
        title, slug,
        excerpt = '',
        content = '',
        category = 'AI Industry',
        tags = [],
        author = 'AI News Hub',
        image_url = null
      } = req.body || {};

      if (!title || !slug) {
        return res.status(400).json({ error: 'title and slug are required' });
      }

      const { rows } = await query(`
        INSERT INTO public.posts (title, slug, excerpt, content, category, tags, author, image_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (slug) DO UPDATE SET
          title=EXCLUDED.title,
          excerpt=EXCLUDED.excerpt,
          content=EXCLUDED.content,
          category=EXCLUDED.category,
          tags=EXCLUDED.tags,
          author=EXCLUDED.author,
          image_url=EXCLUDED.image_url
        RETURNING id, title, slug, excerpt, content, category, tags, author, image_url, published_at
      `, [title, slug, excerpt, content, category, tags, author, image_url]);

      return res.status(201).json(rows[0]);
    }

    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
