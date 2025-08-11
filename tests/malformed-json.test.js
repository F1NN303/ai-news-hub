const test = require('node:test');
const assert = require('node:assert');
const { newDb } = require('pg-mem');

const originalEnv = { ...process.env };
process.env.STACK_AUTH_PROJECT_ID = 'proj';
process.env.STACK_AUTH_CLIENT_ID = 'client';
process.env.STACK_AUTH_CLIENT_SECRET = 'stacksecret';
process.env.JWKS_URL = 'https://example.com/jwks.json';
process.env.DATABASE_URL = 'postgres://localhost/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'cookiesecret';

test('PUT /api/posts/:slug returns 400 for invalid JSON', async () => {
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

  const req = { method: 'PUT', query: { id: 'test-slug' }, headers: { cookie, 'x-csrf-token': csrfToken }, body: '{ invalid json' };
  let statusCode;
  let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {}
  };

  await handler(req, res);

  assert.strictEqual(statusCode, 400);
  assert.strictEqual(jsonBody.error, 'Invalid JSON');
});

test.after(() => {
  process.env = originalEnv;
});
