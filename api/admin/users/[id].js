const db = require('../../../lib/db');
const requireAdmin = require('../../../lib/requireAdmin');
const { ensureCsrf, validateCsrf } = require('../../../lib/csrf');

module.exports = async (req, res) => {
  ensureCsrf(req, res);
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = req.query.id;
  try {
    if (req.method === 'PUT') {
      if (!validateCsrf(req)) {
        return res.status(403).json({ error: 'invalid_csrf_token' });
      }
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch (err) {
        return res.status(400).json({ error: 'Invalid JSON' });
      }
      const fields = [];
      const params = [];
      if (body.role) {
        params.push(body.role);
        fields.push(`role=$${params.length}`);
      }
      if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
      params.push(id);
      const { rows } = await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id=$${params.length} RETURNING id, name, email, role`, params);
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      if (!validateCsrf(req)) {
        return res.status(403).json({ error: 'invalid_csrf_token' });
      }
      await db.query('DELETE FROM users WHERE id=$1', [id]);
      return res.status(204).end();
    }
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(`/api/admin/users/${id} error:`, err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
