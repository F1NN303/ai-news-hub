const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('GET /api/auth/oauth/[provider] redirects with project ID', async () => {
  process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj123';
  const handler = require('../api/auth/oauth/[provider].js');
  const req = { method: 'GET', query: { provider: 'github' }, headers: { host: 'localhost:3000' } };
  let statusCode; const headers = {};
  const res = {
    setHeader(k, v) { headers[k] = v; },
    writeHead(c, h) { statusCode = c; Object.assign(headers, h); return this; },
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 302);
  assert.ok(headers.Location.includes('client_id=proj123'));
});

test('missing project ID returns 500', async () => {
  delete process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  const handler = require('../api/auth/oauth/[provider].js');
  const req = { method: 'GET', query: { provider: 'github' }, headers: { host: 'localhost:3000' } };
  let statusCode; let jsonBody;
  const res = {
    status(c) { statusCode = c; return this; },
    json(b) { jsonBody = b; return this; },
    setHeader() {},
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 500);
  assert.deepStrictEqual(jsonBody, { error: 'missing_project_id' });
});

test.after(() => {
  process.env = originalEnv;
});

