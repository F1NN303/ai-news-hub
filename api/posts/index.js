const db = require('../db');

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { reject(e); }
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const tag = url.searchParams.get('tag') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '10', 10));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (q) { params.push(`%${q}%`); where.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR content ILIKE $${params.length})`); }
    if (category) { params.push(category); where.push(`category = $${params.length}`); }
    if (tag) { params.push(tag); where.push(`$${params.length} = ANY(tags)`); }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows, total] = await Promise.all([
      db.query(
        `SELECT id, slug, title, excerpt, category, tags, author, hero_image, published_at
         FROM posts ${whereSql}
         ORDER BY published_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
      ),
      db.query(`SELECT COUNT(*) FROM posts ${whereSql}`, params)
    ]);

    return res.status(200).end(JSON.stringify({
      page, limit,
      total: Number(total.rows[0].count),
      items: rows.rows
    }));
  }

  if (req.method === 'POST') {
    try {
      const data = await readJson(req);
      const { title, slug, excerpt = '', category = 'General', tags = [], author = 'Unknown', hero_image = '', content = '' } = data;
      if (!title || !slug) return res.status(400).end(JSON.stringify({ error: 'title and slug are required' }));

      const result = await db.query(
        `INSERT INTO posts (title, slug, excerpt, category, tags, author, hero_image, content)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [title, slug, excerpt, category, tags, author, hero_image, content]
      );
      return res.status(201).end(JSON.stringify(result.rows[0]));
    } catch (e) {
      console.error(e);
      return res.status(500).end(JSON.stringify({ error: 'failed to create post' }));
    }
  }

  res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
};
