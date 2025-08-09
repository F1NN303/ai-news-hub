const test = require('node:test');
const assert = require('node:assert');
const { getSessionToken } = require('../lib/cookies');

test('extracts session token from simple cookie string', () => {
  const req = { headers: { cookie: 'session=abc123' } };
  assert.strictEqual(getSessionToken(req), 'abc123');
});

test('extracts token when multiple cookies with spaces', () => {
  const req = { headers: { cookie: 'foo=1; session=abc123; bar=2' } };
  assert.strictEqual(getSessionToken(req), 'abc123');
});

test('returns null when session cookie missing', () => {
  const req = { headers: { cookie: 'foo=1; bar=2' } };
  assert.strictEqual(getSessionToken(req), null);
});

test('returns null when cookie header absent', () => {
  const req = { headers: {} };
  assert.strictEqual(getSessionToken(req), null);
});

test('returns null for empty session cookie', () => {
  const req = { headers: { cookie: 'session=' } };
  assert.strictEqual(getSessionToken(req), null);
});
