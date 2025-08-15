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
  const src = fs.readFileSync(filePath, 'utf8');
  const updated = src
    .replace(/\$\{AUTH0_CLIENT_ID\}/g, clientId)
    .replace(/\$\{AUTH0_DOMAIN\}/g, domain)
    .replace(/__INJECTED__/g, audience);
  fs.writeFileSync(filePath, updated);
}
