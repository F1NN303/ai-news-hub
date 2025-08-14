const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { ensureConfig } = require('./auth');

let client;
function getClient() {
  if (!client) {
    ensureConfig(['AUTH0_ISSUER_BASE_URL', 'AUTH0_CLIENT_ID']);
    client = jwksRsa({
      jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true
    });
  }
  return client;
}

function getKey(header, callback) {
  try {
    getClient().getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key.getPublicKey ? key.getPublicKey() : key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    });
  } catch (err) {
    callback(err);
  }
}

module.exports = async function requireUser(req, res) {
  const authHeader = req.headers && req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }

  const token = authHeader.slice(7);
  try {
    const user = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: process.env.AUTH0_CLIENT_ID,
          issuer: `${process.env.AUTH0_ISSUER_BASE_URL}/`,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded);
        }
      );
    });
    req.user = user;
    return user;
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'invalid_token' });
    return null;
  }
};
