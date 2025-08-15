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

const files = [
  'public/index.html',
  'public/login/index.html',
  'public/signup/index.html',
  'public/auth/callback.html',
  'public/profile.html',
  'public/post.html'
];

for (const file of files) {
  const filePath = path.join(__dirname, '..', file);
  const src = fs.readFileSync(filePath, 'utf8');
  const updated = src
    .replace(/\$\{AUTH0_CLIENT_ID\}/g, clientId)
    .replace(/\$\{AUTH0_DOMAIN\}/g, domain)
    .replace(/__INJECTED__/g, audience);
  fs.writeFileSync(filePath, updated);
}
