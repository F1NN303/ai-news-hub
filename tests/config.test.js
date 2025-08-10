const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('health endpoint returns 500 when config missing', async () => {
  process.env.STACK_PROJECT_ID = 'proj';
  process.env.JWT_SECRET = 'secret';
  process.env.SESSION_SECRET = 'sess';
  process.env.JWKS_URL = 'https://example.com/jwks.json';
  process.env.DATABASE_URL = 'postgres://localhost/test';
  delete process.env.STACK_AUTH_CLIENT_ID;
  delete require.cache[require.resolve('../lib/auth')];
  delete require.cache[require.resolve('../api/health.js')];
  const handler = require('../api/health.js');
  let status; let json;
  const res = {
    status(c){ status=c; return this; },
    json(d){ json=d; return this; },
    setHeader(){},
    end(){},
  };
  await handler({}, res);
  assert.strictEqual(status, 500);
  assert.deepStrictEqual(json, { error: 'missing_config' });
});

test.after(() => {
  process.env = originalEnv;
});
