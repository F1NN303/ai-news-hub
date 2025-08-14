#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const clientId = process.env.AUTH0_CLIENT_ID;
if (!clientId) {
  console.error('AUTH0_CLIENT_ID not set');
  process.exit(1);
}

const files = [
  'public/index.html',
  'public/login/index.html',
  'public/signup/index.html',
  'public/auth/callback.html'
];

for (const file of files) {
  const filePath = path.join(__dirname, '..', file);
  const src = fs.readFileSync(filePath, 'utf8');
  const updated = src.replace(/\$\{AUTH0_CLIENT_ID\}/g, clientId);
  fs.writeFileSync(filePath, updated);
}
