const test = require('node:test');
const assert = require('node:assert');

// Ensure non-admin users are forbidden

test('POST /api/posts forbids non-admin users', async (t) => {
  const db = require('../lib/db');
  const originalQuery = db.query;
  db.query = async (text, params) => {
    if (text.includes('SELECT role FROM users')) {
      return { rows: [{ role: 'user' }] };
    }
    throw new Error('should not query posts');
  };
  const auth = require('../lib/auth');
  const originalVerify = auth.verifyToken;
  auth.verifyToken = async () => ({ sub: '1' });
  t.after(() => {
    db.query = originalQuery;
    auth.verifyToken = originalVerify;
  });
  const handler = require('../api/posts/index.js');
  const req = { method: 'POST', headers: { cookie: 'session=valid' }, body: { title: 't', slug: 's' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 403);
  assert.deepStrictEqual(jsonBody, { error: 'forbidden' });
});

test('PUT /api/posts/:id forbids non-admin users', async (t) => {
  const db = require('../lib/db');
  const originalQuery = db.query;
  db.query = async (text, params) => {
    if (text.includes('SELECT role FROM users')) {
      return { rows: [{ role: 'user' }] };
    }
    throw new Error('should not query posts');
  };
  const auth = require('../lib/auth');
  const originalVerify = auth.verifyToken;
  auth.verifyToken = async () => ({ sub: '1' });
  t.after(() => {
    db.query = originalQuery;
    auth.verifyToken = originalVerify;
  });
  const handler = require('../api/posts/[id].js');
  const req = { method: 'PUT', query: { id: '1' }, headers: { cookie: 'session=valid' }, body: { title: 'x' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 403);
  assert.deepStrictEqual(jsonBody, { error: 'forbidden' });
});

test('DELETE /api/posts/:id forbids non-admin users', async (t) => {
  const db = require('../lib/db');
  const originalQuery = db.query;
  db.query = async (text, params) => {
    if (text.includes('SELECT role FROM users')) {
      return { rows: [{ role: 'user' }] };
    }
    throw new Error('should not query posts');
  };
  const auth = require('../lib/auth');
  const originalVerify = auth.verifyToken;
  auth.verifyToken = async () => ({ sub: '1' });
  t.after(() => {
    db.query = originalQuery;
    auth.verifyToken = originalVerify;
  });
  const handler = require('../api/posts/[id].js');
  const req = { method: 'DELETE', query: { id: '1' }, headers: { cookie: 'session=valid' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 403);
  assert.deepStrictEqual(jsonBody, { error: 'forbidden' });
});
