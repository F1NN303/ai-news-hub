const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'pub';
process.env.STACK_AUTH_SECRET = 'stacksecret';
process.env.DATABASE_URL = 'postgres://localhost/test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'cookiesecret';

async function setup() {
  process.env.SESSION_SECRET = 'cookiesecret';
  delete require.cache[require.resolve('../lib/auth')];
  delete require.cache[require.resolve('../lib/cookies')];
  delete require.cache[require.resolve('../lib/requireUser')];
  delete require.cache[require.resolve('../lib/requireAdmin')];
  delete require.cache[require.resolve('../lib/csrf')];
  delete require.cache[require.resolve('../api/comments.js')];
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();
  await pool.query(`CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, role TEXT);`);
  await pool.query(`CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT, slug TEXT);`);
  await pool.query(`CREATE TABLE comments (id SERIAL PRIMARY KEY, post_id INT REFERENCES posts(id), user_id INT REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());`);
  await pool.query(`INSERT INTO users (name, email, password_hash, role) VALUES ('Owner','o@a.b','x','user'),('Other','oth@a.b','x','user'),('Admin','ad@a.b','x','admin');`);
  await pool.query(`INSERT INTO posts (title, slug) VALUES ('Post','post');`);
  const db = require('../lib/db');
  db.query = (text, params) => pool.query(text, params);
  const auth = require('../lib/auth');
  auth.verifySessionToken = async (token) => ({ userId: token });
  const { signSessionToken } = require('../lib/cookies');
  const { signCsrfToken } = require('../lib/csrf');
  const handler = require('../api/comments.js');
  return { pool, signSessionToken, signCsrfToken, handler };
}

test('DELETE /api/comments/:id allows only owners or admins', async () => {
  const { pool, signSessionToken, signCsrfToken, handler } = await setup();

  await pool.query(`INSERT INTO comments (id, post_id, user_id, content) VALUES (1,1,1,'first');`);

  const csrfToken = 'c1';

  // non-owner
  const cookieUser2 = `session=${signSessionToken('2')}; csrf=${signCsrfToken(csrfToken)}`;
  const req2 = { method: 'DELETE', query: { id: '1' }, headers: { cookie: cookieUser2, 'x-csrf-token': csrfToken } };
  let status2, body2;
  const res2 = { status(c){status2=c;return this;}, json(d){body2=d;return this;}, setHeader(){}, end(){} };
  await handler(req2, res2);
  assert.strictEqual(status2, 403);
  assert.deepStrictEqual(body2, { error: 'forbidden' });
  const { rows: afterNonOwner } = await pool.query('SELECT * FROM comments WHERE id=1');
  assert.strictEqual(afterNonOwner.length, 1);

  // owner
  const cookieOwner = `session=${signSessionToken('1')}; csrf=${signCsrfToken(csrfToken)}`;
  const reqOwner = { method: 'DELETE', query: { id: '1' }, headers: { cookie: cookieOwner, 'x-csrf-token': csrfToken } };
  let statusOwner;
  const resOwner = { status(c){statusOwner=c;return this;}, json(){}, setHeader(){}, end(){} };
  await handler(reqOwner, resOwner);
  assert.strictEqual(statusOwner, 204);
  const { rows: afterOwner } = await pool.query('SELECT * FROM comments WHERE id=1');
  assert.strictEqual(afterOwner.length, 0);

  // admin
  await pool.query(`INSERT INTO comments (id, post_id, user_id, content) VALUES (2,1,1,'second');`);
  const cookieAdmin = `session=${signSessionToken('3')}; csrf=${signCsrfToken(csrfToken)}`;
  const reqAdmin = { method: 'DELETE', query: { id: '2' }, headers: { cookie: cookieAdmin, 'x-csrf-token': csrfToken } };
  let statusAdmin;
  const resAdmin = { status(c){statusAdmin=c;return this;}, json(){}, setHeader(){}, end(){} };
  await handler(reqAdmin, resAdmin);
  assert.strictEqual(statusAdmin, 204);
  const { rows: afterAdmin } = await pool.query('SELECT * FROM comments WHERE id=2');
  assert.strictEqual(afterAdmin.length, 0);
});

test.after(() => {
  process.env = originalEnv;
});
