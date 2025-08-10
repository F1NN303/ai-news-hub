const crypto = require('node:crypto');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const provider = req.query.provider;
    if (!provider) {
      return res.status(400).json({ error: 'missing_provider' });
    }

    const clientId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'missing_config' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;
    const url = new URL('https://api.stack-auth.com/api/v1/oauth/authorize');
    url.searchParams.set('provider', provider);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    const cookie = `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Max-Age=600; Path=/`;
    res.setHeader('Set-Cookie', cookie);
    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
