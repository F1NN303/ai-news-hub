const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'pub';
process.env.STACK_AUTH_SECRET = 'stacksecret';
process.env.DATABASE_URL = 'postgres://localhost/test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'cookiesecret';

// Signup route

test('POST /api/auth/signup creates user with hashed password', async () => {
  process.env.SESSION_SECRET = 'cookiesecret';
  delete require.cache[require.resolve('../lib/csrf')];
  const { newDb } = require('pg-mem');
  const mem = newDb();
  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();
  await pool.query(`CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`);

  const db = require('../lib/db');
  db.query = (text, params) => pool.query(text, params);

  const handler = require('../api/auth/signup.js');
  const { signCsrfToken } = require('../lib/csrf');
  const csrfToken = 't1';
  const csrfCookie = `csrf=${signCsrfToken(csrfToken)}`;
  const req = { method: 'POST', body: { name: 'Bob', email: 'bob@example.com', password: 'secret' }, headers: { cookie: csrfCookie, 'x-csrf-token': csrfToken } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 201);
  assert.strictEqual(jsonBody.email, 'bob@example.com');
  const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', ['bob@example.com']);
  assert.strictEqual(rows[0].role, 'user');
  assert.notStrictEqual(rows[0].password_hash, 'secret');
});


// Logout route

test('logout clears session cookie', async () => {
  const handler = require('../api/auth/logout.js');
  const req = {};
  let statusCode; const headers = {};
  const res = {
    setHeader(k,v){ headers[k]=v; },
    writeHead(c,h){ statusCode=c; Object.assign(headers,h); return this; },
    end(){},
  };
  await handler(req,res);
  assert.strictEqual(statusCode,302);
  assert.strictEqual(headers.Location,'/');
  assert.match(headers['Set-Cookie'], /session=/);
  assert.match(headers['Set-Cookie'], /Max-Age=0/);
  assert.match(headers['Set-Cookie'], /HttpOnly/);
  assert.match(headers['Set-Cookie'], /Secure/);
  assert.match(headers['Set-Cookie'], /SameSite=Strict/);
  assert.match(headers['Set-Cookie'], /Path=\//);
});

// restore env

test.after(() => {
  process.env = originalEnv;
});
