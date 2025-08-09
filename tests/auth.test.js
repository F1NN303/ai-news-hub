const test = require('node:test');
const assert = require('node:assert');

const originalEnv = { ...process.env };

test('login redirects to Stack Auth', async () => {
  process.env.STACK_AUTH_PROJECT_ID = 'pid';
  process.env.STACK_AUTH_CLIENT_ID = 'cid';

  const handler = require('../api/auth/login.js');
  const req = { query: {}, headers: { host: 'example.com', 'x-forwarded-proto': 'https' } };
  let statusCode; const headers = {};
  const res = {
    status(c){ statusCode = c; return this; },
    setHeader(k,v){ headers[k]=v; },
    end(){},
  };
  await handler(req,res);
  assert.strictEqual(statusCode,302);
  const loc = headers.Location;
  const url = new URL(loc);
  assert.strictEqual(url.origin,'https://api.stack-auth.com');
  assert.strictEqual(url.pathname,'/api/v1/oauth/authorize');
  assert.strictEqual(url.searchParams.get('response_type'),'code');
  assert.strictEqual(url.searchParams.get('provider'),'github');
  assert.strictEqual(url.searchParams.get('redirect_uri'),'https://example.com/api/auth/callback');
  assert.strictEqual(url.searchParams.get('client_id'),'cid');
  assert.strictEqual(url.searchParams.get('project_id'),'pid');
});

test('callback exchanges code and sets cookie', async () => {
  process.env.STACK_AUTH_PROJECT_ID = 'pid';
  process.env.STACK_AUTH_CLIENT_ID = 'cid';
  const handler = require('../api/auth/callback.js');
  const req = { query:{ code:'abc'}, headers:{ host:'example.com','x-forwarded-proto':'https'} };
  let statusCode; const headers = {};
  const res = {
    status(c){ statusCode = c; return this; },
    setHeader(k,v){ headers[k]=v; },
    writeHead(c,h){ statusCode=c; Object.assign(headers,h); return this; },
    end(){},
    json(data){ headers.body=data; }
  };

  const tokenResponse = { access_token:'tok', expires_in:120 };
  global.fetch = async (url, opts) => {
    assert.strictEqual(url,'https://api.stack-auth.com/api/v1/oauth/token');
    const body = JSON.parse(opts.body);
    assert.strictEqual(body.code,'abc');
    return { ok:true, json: async () => tokenResponse };
  };

  await handler(req,res);
  assert.strictEqual(statusCode,302);
  assert.strictEqual(headers.Location,'/');
  assert.match(headers['Set-Cookie'], /session=tok/);
  assert.match(headers['Set-Cookie'], /Max-Age=120/);
  assert.match(headers['Set-Cookie'], /HttpOnly/);
  assert.match(headers['Set-Cookie'], /Secure/);
  assert.match(headers['Set-Cookie'], /SameSite=Lax/);

  delete global.fetch;
});

test('logout clears session cookie', async () => {
  const handler = require('../api/auth/logout.js');
  const req = {};
  let statusCode; const headers = {};
  const res = {
    setHeader(k,v){ headers[k]=v; },
    writeHead(c,h){ statusCode=c; Object.assign(headers,h); return this; },
    end(){},
  };
  await handler(req,res);
  assert.strictEqual(statusCode,302);
  assert.strictEqual(headers.Location,'/');
  assert.match(headers['Set-Cookie'], /session=/);
  assert.match(headers['Set-Cookie'], /Max-Age=0/);
});

test.after(() => {
  process.env = originalEnv;
});
