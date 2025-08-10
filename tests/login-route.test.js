const test = require('node:test');
const assert = require('node:assert');

process.env.DATABASE_URL = 'postgres://localhost/test';

const handler = require('../api/auth/login.js');

test('GET /api/auth/login -> 302 to /api/auth/oauth/google', async () => {
  const req = { method: 'GET' };
  let status, headers = {};
  const res = {
    setHeader(k, v) { headers[k] = v; },
    writeHead(code, h) { status = code; headers = { ...headers, ...h }; },
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(status, 302);
  assert.strictEqual(headers.Location, '/api/auth/oauth/google');
});
