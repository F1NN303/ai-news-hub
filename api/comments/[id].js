const db = require('../../lib/db');
const requireUser = require('../../lib/requireUser');
const requireAdmin = require('../../lib/requireAdmin');
const { ensureCsrf, validateCsrf } = require('../../lib/csrf');

module.exports = async (req, res) => {
  const id = req.query.id;
  try {
    ensureCsrf(req, res);
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
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
