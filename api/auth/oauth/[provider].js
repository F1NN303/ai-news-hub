const crypto = require('node:crypto');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const provider = req.query.provider;
  if (!provider) {
    return res.status(400).json({ error: 'missing_provider' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${proto}://${host}`;
  const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/callback`);
  const clientId = process.env.STACK_AUTH_CLIENT_ID || '';
  const url =
    `https://api.stack-auth.com/api/v1/oauth/authorize?provider=${encodeURIComponent(
      provider
    )}&client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&state=${state}`;

  const cookie = `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Max-Age=600; Path=/`;
  res.setHeader('Set-Cookie', cookie);
  res.writeHead(302, { Location: url });
  res.end();
};
