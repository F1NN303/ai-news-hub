const test = require('node:test');
const assert = require('node:assert');
const { generateKeyPair, exportJWK, SignJWT } = require('jose');

process.env.NEXT_PUBLIC_STACK_PROJECT_ID = 'proj';
process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY = 'pub';
process.env.STACK_AUTH_SECRET = 'sec';
process.env.SESSION_SECRET = 'sess';
process.env.DATABASE_URL = 'postgres://localhost/test';

test('GET /api/auth/callback with token sets session', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = 'test';

  const originalFetch = global.fetch;
  global.fetch = async (url) => ({ ok: true, json: async () => ({ keys: [publicJwk] }) });

  const idToken = await new SignJWT({ sub: '1', email: 'a', name: 'A' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);

  const req = {
    method: 'GET',
    headers: { cookie: 'oauth_state=xyz', host: 'example.com' },
    query: { token: idToken, state: 'xyz' },
  };
  const headers = {};
  const res = {
    headers,
    setHeader(k, v) { headers[k] = v; },
    getHeader(k) { return headers[k]; },
    writeHead(code, h) { this.status = code; Object.assign(headers, h); },
    status(code) { this.status = code; return this; },
    json() {},
    end() {},
  };

  const auth = require('../lib/auth');
  const originalUpsert = auth.upsertUserByOidc;
  auth.upsertUserByOidc = async () => ({ id: 1, role: 'user' });

  const handler = require('../api/auth/callback.js');
  await handler(req, res);

  auth.upsertUserByOidc = originalUpsert;
  global.fetch = originalFetch;

  assert.strictEqual(res.status, 302);
  assert.strictEqual(headers.Location, '/');
  assert.ok(Array.isArray(headers['Set-Cookie']));
  assert.ok(headers['Set-Cookie'].find((c) => c.startsWith('session=')));
});
