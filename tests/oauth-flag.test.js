const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('NEXT_PUBLIC_HAS_OAUTH reflects STACK_AUTH_CLIENT_ID', () => {
  delete require.cache[require.resolve('../lib/auth')];
  delete process.env.STACK_AUTH_CLIENT_ID;
  require('../lib/auth');
  assert.strictEqual(process.env.NEXT_PUBLIC_HAS_OAUTH, 'false');

  delete require.cache[require.resolve('../lib/auth')];
  process.env.STACK_AUTH_CLIENT_ID = 'abc';
  require('../lib/auth');
  assert.strictEqual(process.env.NEXT_PUBLIC_HAS_OAUTH, 'true');
});

test.after(() => {
  process.env = originalEnv;
});
