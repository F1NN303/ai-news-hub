const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('oauth authorize URL contains required params', async () => {
  process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
  process.env.STACK_SECRET_KEY = 'secret';
  process.env.JWT_SECRET = 'jwt';
  process.env.SESSION_SECRET = 'session';
  process.env.DATABASE_URL = 'postgres://localhost/test';
  process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'pubkey';

  delete require.cache[require.resolve('../lib/auth')];
  delete require.cache[require.resolve('../api/auth/oauth/[provider].js')];
  const handler = require('../api/auth/oauth/[provider].js');

  const req = {
    method: 'GET',
    query: { provider: 'google' },
    headers: {
      host: 'localhost:3000',
      'x-forwarded-proto': 'http',
    },
  };

  let redirect;
  const res = {
    setHeader() {},
    writeHead(status, headers) {
      redirect = headers.Location;
    },
    end() {},
    status(code) {
      this.statusCode = code; return this;
    },
    json(obj) {
      this.jsonObj = obj; return this;
    },
  };

  await handler(req, res);
  assert.ok(redirect, 'redirect missing');
  const url = new URL(redirect);
  assert.strictEqual(
    url.origin + url.pathname,
    'https://api.stack-auth.com/api/v1/auth/oauth/authorize'
  );
  assert.strictEqual(url.searchParams.get('provider'), 'google');
  assert.strictEqual(url.searchParams.get('client_id'), 'pubkey');
  assert.strictEqual(
    url.searchParams.get('redirect_uri'),
    'http://localhost:3000/api/auth/callback'
  );
  assert.ok(url.searchParams.get('state'));
});

test.after(() => {
  process.env = originalEnv;
});
