const test = require('node:test');
const assert = require('node:assert');
const { newDb } = require('pg-mem');

// Test updating a post via slug

test('PUT /api/posts/:slug updates by slug', async () => {
  const mem = newDb();
  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();
  await pool.query(`CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    category TEXT,
    tags TEXT[],
    author TEXT,
    image_url TEXT,
    content TEXT,
    published_at TIMESTAMPTZ DEFAULT now()
  )`);
  await pool.query(`INSERT INTO posts(slug, title) VALUES('test-slug', 'Old Title')`);

  await pool.query(`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role TEXT
  )`);
  await pool.query(`INSERT INTO users(role) VALUES('admin')`);

  const db = require('../lib/db');
  db.query = (text, params) => pool.query(text, params);

  const auth = require('../lib/auth');
  auth.verifyToken = async () => ({ sub: '1' });

  const { signSessionToken } = require('../lib/cookies');
  const { signCsrfToken } = require('../lib/csrf');
  const sessionCookie = signSessionToken('valid');
  const csrfToken = 'c1';
  const cookie = `session=${sessionCookie}; csrf=${signCsrfToken(csrfToken)}`;

  const handler = require('../api/posts/[id].js');

  const req = { method: 'PUT', query: { id: 'test-slug' }, headers: { cookie, 'x-csrf-token': csrfToken }, body: { title: 'New Title' } };
  let statusCode;
  let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {}
  };

  await handler(req, res);

  assert.strictEqual(statusCode, 200);
  assert.strictEqual(jsonBody.title, 'New Title');

  const { rows } = await pool.query('SELECT title FROM posts WHERE slug = $1', ['test-slug']);
  assert.strictEqual(rows[0].title, 'New Title');
});
