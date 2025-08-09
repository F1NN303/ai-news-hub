const db = require('../../lib/db');
const requireUser = require('../../lib/requireUser');

module.exports = async (req, res) => {
  try {
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
        ORDER BY c.created_at ASC
      `, [postId]);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const user = await requireUser(req, res);
      if (!user) return;
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
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
