const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.STACK_SECRET_KEY = 'stacksecret';
process.env.DATABASE_URL = 'postgres://localhost/test';
process.env.JWT_SECRET = 'jwt';
process.env.SESSION_SECRET = 'session';
process.env.STACK_AUTH_CLIENT_ID = 'client';

test('GET /api/auth/oauth/[provider] redirects with expected params', async () => {
  const handler = require('../api/auth/oauth/[provider].js');
  const req = {
    method: 'GET',
    headers: { 'x-forwarded-proto': 'https', host: 'example.com' },
    query: { provider: 'github' },
  };
  let statusCode; let location; let setCookie;
  const res = {
    setHeader(k, v) { if (k === 'Set-Cookie') setCookie = v; },
    writeHead(code, headers) { statusCode = code; location = headers.Location; return this; },
    end() {},
    status(code) { statusCode = code; return this; },
    json(obj) { throw new Error('json called'); },
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 302);
  const redirected = new URL(location);
  assert.strictEqual(redirected.origin + redirected.pathname, 'https://api.stack-auth.com/api/v1/oauth/authorize');
  const params = redirected.searchParams;
  assert.strictEqual(params.get('provider'), 'github');
  assert.strictEqual(params.get('client_id'), 'client');
  assert.strictEqual(params.get('redirect_uri'), 'https://example.com/api/auth/callback');
  const state = params.get('state');
  assert.ok(state);
  const cookieState = /oauth_state=([^;]+)/.exec(setCookie)[1];
  assert.strictEqual(state, cookieState);
});

test('GET /api/auth/oauth/[provider] requires client id', async () => {
  delete process.env.STACK_AUTH_CLIENT_ID;
  const handler = require('../api/auth/oauth/[provider].js');
  const req = {
    method: 'GET',
    headers: { 'x-forwarded-proto': 'https', host: 'example.com' },
    query: { provider: 'github' },
  };
  let statusCode; let body;
  const res = {
    setHeader() {},
    writeHead() { return this; },
    end() {},
    status(code) { statusCode = code; return this; },
    json(obj) { body = obj; },
  };
  await handler(req, res);
  assert.strictEqual(statusCode, 500);
  assert.deepStrictEqual(body, { error: 'missing_config' });
});

test.after(() => {
  process.env = originalEnv;
});
