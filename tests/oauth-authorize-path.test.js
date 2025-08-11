const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('authorize URL uses v1 auth path', async () => {
  process.env.STACK_PROJECT_ID = 'proj';
  process.env.STACK_AUTH_CLIENT_ID = 'client';
  process.env.STACK_SECRET_KEY = 'stacksecret';
  process.env.SESSION_SECRET = 'session';
  process.env.JWT_SECRET = 'jwt';
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
  assert.strictEqual(url.pathname, '/api/v1/auth/oauth/authorize');
  assert.strictEqual(url.searchParams.get('provider'), 'google');
});

test.after(() => {
  process.env = originalEnv;
});
