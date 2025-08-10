const test = require('node:test');
const assert = require('node:assert');

process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'pub';
process.env.STACK_AUTH_SECRET = 'sec';
process.env.SESSION_SECRET = 'sess';
process.env.DATABASE_URL = 'postgres://localhost/test';

const handler = require('../api/auth/login.js');

test('GET /api/auth/login -> redirect to Stack Auth authorize', async () => {
  const req = { method: 'GET', headers: { host: 'example.com' } };
  let status;
  const headers = {};
  const res = {
    setHeader(k, v) { headers[k] = v; },
    writeHead(code, h) { status = code; Object.assign(headers, h); },
    end() {},
  };
  await handler(req, res);
  assert.strictEqual(status, 302);
  const url = new URL(headers.Location);
  assert.strictEqual(url.origin + url.pathname, 'https://api.stack-auth.com/api/v1/auth/authorize');
  assert.strictEqual(url.searchParams.get('provider'), 'google');
  assert.strictEqual(url.searchParams.get('client_id'), 'pub');
  assert.strictEqual(url.searchParams.get('redirect_uri'), 'https://example.com/api/auth/callback');
  assert.ok(url.searchParams.get('state'));
});
