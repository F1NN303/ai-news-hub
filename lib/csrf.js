const crypto = require('node:crypto');

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = 'csrf';

function signCsrfToken(token) {
  if (!SESSION_SECRET) return token;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(token);
  return `${token}.${hmac.digest('base64url')}`;
}

function unsignCsrfToken(raw) {
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

function getTokenFromCookie(req) {
  const cookieHeader = req?.headers?.cookie || '';
  const part = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(COOKIE_NAME + '='));
  if (!part) return null;
  const raw = part.slice(COOKIE_NAME.length + 1);
  return unsignCsrfToken(raw);
}

function setCsrfCookie(res, token) {
  const signed = signCsrfToken(token);
  const cookie = `${COOKIE_NAME}=${signed}; Secure; SameSite=Strict; Path=/`;
  const existing = res.getHeader && res.getHeader('Set-Cookie');
  if (existing) {
    if (Array.isArray(existing)) res.setHeader('Set-Cookie', [...existing, cookie]);
    else res.setHeader('Set-Cookie', [existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
}

function ensureCsrf(req, res) {
  let token = getTokenFromCookie(req);
  if (!token) {
    token = crypto.randomBytes(18).toString('base64url');
    setCsrfCookie(res, token);
  }
  return token;
}

function validateCsrf(req) {
  const token = getTokenFromCookie(req);
  const header = req?.headers && (req.headers['x-csrf-token'] || req.headers['x-xsrf-token']);
  return !!token && !!header && token === header;
}

module.exports = { ensureCsrf, validateCsrf, signCsrfToken };
