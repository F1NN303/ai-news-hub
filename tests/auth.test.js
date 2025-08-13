const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { join } = require('node:path');
const { once } = require('node:events');
const { fetch } = require('undici');

let server;
let base;

before(async () => {
  server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let filePath = join(process.cwd(), url.pathname);
      try {
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
          filePath = join(filePath, 'index.html');
        }
      } catch {
        try {
          await stat(filePath + '.html');
          filePath = filePath + '.html';
        } catch {
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }
      }
      const data = await readFile(filePath);
      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(data);
    } catch (err) {
      res.statusCode = 500;
      res.end(err.message);
    }
  });
  server.listen(0);
  await once(server, 'listening');
  const { port } = server.address();
  base = `http://localhost:${port}`;
});

after(() => {
  server.close();
});

test('GET /login contains Sign in and Google link', async () => {
  const res = await fetch(`${base}/login`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Sign in/);
  assert.match(html, /Continue with Google/);
  assert.ok(
    html.includes('href="/api/auth/login?connection=google-oauth2"'),
    'Google link href matches'
  );
});

for (const page of ['privacy', 'terms', 'cookie-policy']) {
  test(`GET /legal/${page}.html returns 200`, async () => {
    const res = await fetch(`${base}/legal/${page}.html`);
    assert.equal(res.status, 200);
  });
}
