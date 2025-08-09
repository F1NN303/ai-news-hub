const db = require('../../lib/db');

module.exports = async (req, res) => {
  const id = req.query.id;
  try {
    if (req.method === 'GET') {
      const isNumeric = /^\d+$/.test(id);
      const query = isNumeric
        ? 'SELECT * FROM posts WHERE id = $1'
        : 'SELECT * FROM posts WHERE slug = $1';
      const { rows } = await db.query(query, [id]);
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'PUT') {
      const cookie = req.headers?.cookie || '';
      const hasSession = cookie.split(';').some(c => c.trim().startsWith('session='));
      if (!hasSession) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (err) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
      const fields = ['title','excerpt','content','category','tags','image_url','author'];
      const set = [], params = [];
      fields.forEach(f => { if (body[f] !== undefined) { params.push(body[f]); set.push(`${f}=$${params.length}`); }});
      if (!set.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(id);
      const isNumeric = /^\d+$/.test(id);
      const query = `UPDATE posts SET ${set.join(', ')} WHERE ${isNumeric ? 'id' : 'slug'} = $${params.length} RETURNING *`;
      const { rows } = await db.query(query, params);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const cookie = req.headers?.cookie || '';
      const hasSession = cookie.split(';').some(c => c.trim().startsWith('session='));
      if (!hasSession) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const isNumeric = /^\d+$/.test(id);
      const query = isNumeric
        ? 'DELETE FROM posts WHERE id = $1'
        : 'DELETE FROM posts WHERE slug = $1';
      await db.query(query, [id]);
      return res.status(204).end();
    }
    res.setHeader('Allow', ['GET','PUT','DELETE']);
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(`/api/posts/${id} error:`, err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
