const crypto = require('node:crypto');

const SESSION_SECRET = process.env.SESSION_SECRET;

function signSessionToken(token) {
  if (!SESSION_SECRET) return token;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(token);
  const signature = hmac.digest('base64url');
  return `${token}.${signature}`;
}

function getSessionToken(req) {
  const cookieHeader = req?.headers?.cookie || '';
  const session = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='));
  if (!session) return null;
  const raw = session.slice('session='.length);
  if (!raw) return null;
  if (!SESSION_SECRET) return raw;
  const idx = raw.lastIndexOf('.');
  if (idx === -1) return null;
  const token = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(token);
  const expected = hmac.digest('base64url');
  return sig === expected ? token : null;
}

module.exports = { getSessionToken, signSessionToken };
