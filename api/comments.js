const db = require('../lib/db');
const { ensureConfig } = require('../lib/auth');
const { requireAuth, requirePermission } = require('./lib/auth');

module.exports = async (req, res) => {
  const id = req.query && req.query.id;
  try {
    ensureConfig();

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
        const auth = await requireAuth(req, res);
        if (!auth) return;
        if (!requirePermission('comments:write')(req, res)) return;
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
        const auth = await requireAuth(req, res);
        if (!auth) return;
        if (!requirePermission('comments:write')(req, res)) return;
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
      const auth = await requireAuth(req, res);
      if (!auth) return;
      if (!requirePermission('comments:write')(req, res)) return;
      const { post_id, content } = req.body || {};
      if (!post_id || !content) {
        return res.status(400).json({ error: 'post_id and content are required' });
      }
      const { rows } = await db.query(`
        INSERT INTO comments (post_id, user_id, content)
        VALUES ($1, $2, $3)
        RETURNING id, content, created_at, post_id, user_id
      `, [post_id, auth.sub, content]);
      const comment = rows[0];
      comment.name = auth.name;
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
