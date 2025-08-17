const fs = require('fs');
const path = require('path');
const assert = require('node:assert');
const test = require('node:test');

function getHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(getHtmlFiles(full));
    else if (entry.isFile() && full.endsWith('.html')) results.push(full);
  }
  return results;
}

const publicDir = path.join(__dirname, '..', 'public');

const required = ['auth0-domain', 'auth0-client-id', 'auth0-audience'];

test('all public html files contain auth0 meta tags', () => {
  const files = getHtmlFiles(publicDir);
  const missing = [];
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    for (const name of required) {
      const re = new RegExp(`<meta[^>]+name=["']${name}["']`, 'i');
      if (!re.test(html)) {
        missing.push(`${path.relative(publicDir, file)} missing ${name}`);
      }
    }
  }
  assert.deepStrictEqual(missing, [], `Missing Auth0 meta tags:\n${missing.join('\n')}`);
});
