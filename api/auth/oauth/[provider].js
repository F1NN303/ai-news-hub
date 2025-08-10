const crypto = require('node:crypto');
const { ensureConfig } = require('../../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    ensureConfig();
    const provider = req.query.provider;
    if (!provider) {
      return res.status(400).json({ error: 'missing_provider' });
    }

    const clientId = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
    if (!clientId) {
      return res
        .status(500)
        .json({ error: 'missing_config', detail: 'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const redirectUri = `${proto}://${host}/api/auth/callback`;

    const authorizeUrl = new URL('https://api.stack-auth.com/api/v1/auth/oauth/authorize');
    authorizeUrl.searchParams.set('provider', provider);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);

    console.log(
      'oauth authorize →',
      authorizeUrl.toString().replace(/client_id=[^&]+/, 'client_id=***')
    );

    const cookie = `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Max-Age=600; Path=/`;
    res.setHeader('Set-Cookie', cookie);
    res.writeHead(302, { Location: authorizeUrl.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
