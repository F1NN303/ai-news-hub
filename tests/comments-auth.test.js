const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.STACK_AUTH_CLIENT_ID = 'client';
process.env.STACK_SECRET_KEY = 'stacksecret';
process.env.DATABASE_URL = 'postgres://localhost/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'cookiesecret';

// Ensure POST requires session cookie

test('POST /api/comments requires session cookie', async () => {
  const handler = require('../api/comments.js');
  const req = { method: 'POST', headers: {}, body: { post_id: 1, content: 'Hello' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 401);
  assert.deepStrictEqual(jsonBody, { error: 'unauthorized' });
});

// Ensure authenticated users can post

test('POST /api/comments allows authenticated users', async () => {
  process.env.JWT_SECRET = 'testsecret';
  process.env.SESSION_SECRET = 'cookiesecret';
  delete require.cache[require.resolve('../lib/auth')];
  delete require.cache[require.resolve('../lib/cookies')];
  delete require.cache[require.resolve('../lib/requireUser')];
  delete require.cache[require.resolve('../lib/csrf')];
  delete require.cache[require.resolve('../api/comments.js')];
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();
  await pool.query(`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, role TEXT);`);
  await pool.query(`CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT, slug TEXT);`);
  await pool.query(`CREATE TABLE comments (id SERIAL PRIMARY KEY, post_id INT REFERENCES posts(id), user_id INT REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());`);
  await pool.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Alice','a@b.c','x','user');`);
  await pool.query(`INSERT INTO posts (title, slug) VALUES ('Post','post');`);

  const db = require('../lib/db');
  db.query = (text, params) => pool.query(text, params);

  const { signJWT } = require('../lib/auth');
  const { signSessionToken } = require('../lib/cookies');
  const { signCsrfToken } = require('../lib/csrf');
  const token = await signJWT({ sub: '1' });
  const csrfToken = 'c1';
  const cookie = `session=${signSessionToken(token)}; csrf=${signCsrfToken(csrfToken)}`;
  const handler = require('../api/comments.js');
  const req = { method: 'POST', headers: { cookie, 'x-csrf-token': csrfToken }, body: { post_id: 1, content: 'Nice article' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 201);
  assert.strictEqual(jsonBody.content, 'Nice article');
  const { rows } = await pool.query('SELECT * FROM comments');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].user_id, 1);
});

test.after(() => {
  process.env = originalEnv;
});
