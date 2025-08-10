const db = require('../lib/db');
const requireUser = require('../lib/requireUser');
const requireAdmin = require('../lib/requireAdmin');
const { ensureCsrf, validateCsrf } = require('../lib/csrf');
const { ensureConfig } = require('../lib/auth');

module.exports = async (req, res) => {
  const id = req.query && req.query.id;
  try {
    ensureConfig();
    ensureCsrf(req, res);

    if (id) {
      if (req.method === 'GET') {
        const { rows } = await db.query(`
          SELECT c.id, c.content, c.created_at, c.post_id, c.user_id, u.name
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.id = $1
        `, [id]);
        const comment = rows[0];
        if (!comment) {
          return res.status(404).json({ error: 'not_found' });
        }
        return res.status(200).json(comment);
      }

      if (req.method === 'PATCH') {
        const user = await requireUser(req, res);
        if (!user) return;
        if (!validateCsrf(req)) {
          return res.status(403).json({ error: 'invalid_csrf_token' });
        }
        const { rows } = await db.query('SELECT user_id FROM comments WHERE id = $1', [id]);
        const comment = rows[0];
        if (!comment) {
          return res.status(404).json({ error: 'not_found' });
        }
        if (user.id !== comment.user_id) {
          const admin = await requireAdmin(req, res);
          if (!admin) return;
        }
        const { content } = req.body || {};
        if (!content) {
          return res.status(400).json({ error: 'content required' });
        }
        await db.query('UPDATE comments SET content = $1 WHERE id = $2', [content, id]);
        const { rows: updated } = await db.query(`
          SELECT c.id, c.content, c.created_at, c.post_id, c.user_id, u.name
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.id = $1
        `, [id]);
        return res.status(200).json(updated[0]);
      }

      if (req.method === 'DELETE') {
        const user = await requireUser(req, res);
        if (!user) return;
        if (!validateCsrf(req)) {
          return res.status(403).json({ error: 'invalid_csrf_token' });
        }
        const { rows } = await db.query('SELECT user_id FROM comments WHERE id = $1', [id]);
        const comment = rows[0];
        if (!comment) {
          return res.status(404).json({ error: 'not_found' });
        }
        if (user.id !== comment.user_id) {
          const admin = await requireAdmin(req, res);
          if (!admin) return;
        }
        await db.query('DELETE FROM comments WHERE id = $1', [id]);
        return res.status(204).end();
      }

      res.setHeader('Allow', ['GET','PATCH','DELETE']);
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (req.method === 'GET') {
      const postId = req.query && req.query.post_id;
      if (!postId) {
        return res.status(400).json({ error: 'post_id required' });
      }
      const { rows } = await db.query(`
        SELECT c.id, c.content, c.created_at, c.post_id, c.user_id, u.name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        ORDER BY c.created_at DESC
        LIMIT 20
      `, [postId]);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
      if (!validateCsrf(req)) {
        return res.status(403).json({ error: 'invalid_csrf_token' });
      }
      const { post_id, content } = req.body || {};
      if (!post_id || !content) {
        return res.status(400).json({ error: 'post_id and content are required' });
      }
      const { rows } = await db.query(`
        INSERT INTO comments (post_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, content, created_at, post_id, user_id
      `, [post_id, user.id, content]);
      const comment = rows[0];
      comment.name = user.name;
      return res.status(201).json(comment);
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
