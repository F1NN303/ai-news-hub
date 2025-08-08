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
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const fields = ['title','excerpt','content','category','tags','cover_image','author'];
      const set=[], params=[];
      fields.forEach(f => { if (body[f] !== undefined) { params.push(body[f]); set.push(`${f}=$${params.length}`); }});
      if (!set.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(id);
      const { rows } = await db.query(
        `UPDATE posts SET ${set.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
        params
      );
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      await db.query('DELETE FROM posts WHERE id = $1', [id]);
      return res.status(204).end();
    }
    res.setHeader('Allow', ['GET','PUT','DELETE']);
    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(`/api/posts/${id} error:`, err);
    res.status(500).json({ error: 'Internal error', detail: err.message });
  }
};
