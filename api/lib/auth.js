const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { ensureConfig } = require('../../lib/auth');

let client;
function getClient() {
  if (!client) {
    ensureConfig(['AUTH0_ISSUER_BASE_URL', 'AUTH0_AUDIENCE']);
    client = jwksRsa({
      jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true
    });
  }
  return client;
}

function getKey(header, callback) {
  getClient().getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey ? key.getPublicKey() : key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function requireAuth(req, res) {
  const authHeader = req.headers && req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: process.env.AUTH0_AUDIENCE,
          issuer: `${process.env.AUTH0_ISSUER_BASE_URL}/`,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded);
        }
      );
    });
    req.auth = decoded;
    return decoded;
  } catch (err) {
    res.status(401).json({ error: 'invalid_token' });
    return null;
  }
}

function requirePermission(perm) {
  return (req, res) => {
    const perms = req.auth?.permissions || (req.auth?.scope ? req.auth.scope.split(' ') : []);
    if (perms.includes('admin:all') || perms.includes(perm)) {
      return true;
    }
    res.status(403).json({ error: 'forbidden' });
    return false;
  };
}

module.exports = { requireAuth, requirePermission };
