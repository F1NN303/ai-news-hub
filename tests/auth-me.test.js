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

// Ensure /api/auth/me returns payload fields

test('GET /api/auth/me returns decoded fields', async () => {
  const auth = require('../lib/auth');
  auth.verifyToken = async () => ({ sub: '1', email: 'a@b.c', name: 'Alice' });
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
  assert.deepStrictEqual(jsonBody, { sub: '1', email: 'a@b.c', name: 'Alice' });
});
