const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');

const ENV_KEYS = [
  'AUTH0_ISSUER_BASE_URL',
  'AUTH0_BASE_URL',
  'AUTH0_CLIENT_ID',
  'AUTH0_CLIENT_SECRET',
  'AUTH0_SECRET'
];

test('env example contains Auth0 keys', async () => {
  const env = await readFile('.env.example', 'utf8');
  for (const key of ENV_KEYS) {
    assert.match(env, new RegExp(`^${key}=`, 'm'));
  }
});

test('package.json has next and react dependencies', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  for (const dep of ['next', 'react', 'react-dom', '@auth0/nextjs-auth0']) {
    assert.ok(pkg.dependencies && pkg.dependencies[dep], `${dep} missing`);
  }
});
