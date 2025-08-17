#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const clientId = process.env.AUTH0_CLIENT_ID;
const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;
if (!clientId || !domain || !audience) {
  console.error('AUTH0_CLIENT_ID, AUTH0_DOMAIN or AUTH0_AUDIENCE not set');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

function getHtmlFiles(dir) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const dirent of dirents) {
    const fullPath = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      results = results.concat(getHtmlFiles(fullPath));
    } else if (dirent.isFile() && path.extname(dirent.name) === '.html') {
      results.push(path.relative(rootDir, fullPath));
    }
  }
  return results;
}

const files = getHtmlFiles(publicDir);

for (const file of files) {
  const filePath = path.join(rootDir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  const headRegex = /<head[^>]*>/i;
  if (!headRegex.test(html)) continue;

  const metas = {
    'auth0-domain': domain,
    'auth0-client-id': clientId,
    'auth0-audience': audience
  };

  const inserts = [];
  for (const [name, value] of Object.entries(metas)) {
    const metaRegex = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i');
    if (metaRegex.test(html)) {
      html = html.replace(metaRegex, `<meta name="${name}" content="${value}">`);
    } else {
      inserts.push(`  <meta name="${name}" content="${value}">`);
    }
  }

  if (inserts.length) {
    html = html.replace(headRegex, match => match + '\n' + inserts.join('\n'));
  }

  fs.writeFileSync(filePath, html);
}
