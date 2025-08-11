const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('authorize URL uses project-scoped auth path', async () => {
  process.env.STACK_AUTH_PROJECT_ID = 'proj';
  process.env.STACK_AUTH_CLIENT_ID = 'client';
  const handler = require('../api/auth/oauth/[provider].js');
  const req = { method: 'GET', query: { provider: 'google' }, headers: { host: 'example.com' } };
  let status; let headers = {};
  const res = {
    setHeader() {},
    writeHead(code, h) { status = code; headers = h; return this; },
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(status, 302);
  const url = new URL(headers.Location);
  assert.strictEqual(url.pathname, '/api/v1/projects/proj/auth/oauth/authorize/google');
});

test.after(() => {
  process.env = originalEnv;
});
