const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };
process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.STACK_SECRET_KEY = 'stacksecret';
process.env.DATABASE_URL = 'postgres://localhost/test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'cookiesecret';

// Ensure POST requires session cookie

test('POST /api/posts requires session cookie', async () => {
  const handler = require('../api/posts/index.js');
  const req = { method: 'POST', headers: {}, body: { title: 't', slug: 's' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {}
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 401);
  assert.deepStrictEqual(jsonBody, { error: 'unauthorized' });
});

// Ensure PUT requires session cookie

test('PUT /api/posts/:id requires session cookie', async () => {
  const handler = require('../api/posts/[id].js');
  const req = { method: 'PUT', query: { id: '1' }, headers: {}, body: { title: 'x' } };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {}
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 401);
  assert.deepStrictEqual(jsonBody, { error: 'unauthorized' });
});

// Ensure DELETE requires session cookie

test('DELETE /api/posts/:id requires session cookie', async () => {
  const handler = require('../api/posts/[id].js');
  const req = { method: 'DELETE', query: { id: '1' }, headers: {} };
  let statusCode; let jsonBody;
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { jsonBody = data; return this; },
    setHeader() {},
    end() {}
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 401);
  assert.deepStrictEqual(jsonBody, { error: 'unauthorized' });
});

test.after(() => {
  process.env = originalEnv;
});
