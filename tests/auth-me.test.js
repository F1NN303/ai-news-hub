const test = require('node:test');
const assert = require('node:assert');

// Ensure /api/auth/me returns 401 without session

test('GET /api/auth/me requires session cookie', async () => {
  const handler = require('../api/auth/me.js');
  const req = { headers: {} };
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

// Ensure /api/auth/me returns user from db

test('GET /api/auth/me returns user profile', async () => {
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
  await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES('Alice','a@b.c','x','user')`);

  const db = require('../lib/db');
  db.query = (text, params) => pool.query(text, params);

  const auth = require('../lib/auth');
  auth.verifyToken = async () => ({ sub: '1' });

  delete require.cache[require.resolve('../api/auth/me.js')];
  const handler = require('../api/auth/me.js');
  const req = { headers: { cookie: 'session=valid' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 200);
  assert.deepStrictEqual(jsonBody, { id: 1, name: 'Alice', email: 'a@b.c', role: 'user' });
});
