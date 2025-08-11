// /api/auth/oauth/[provider].js
const crypto = require('crypto');
const { ensureConfig } = require('../../lib/auth');

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    ensureConfig();

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;

    const clientId = process.env.STACK_AUTH_CLIENT_ID;
    const projectId = process.env.STACK_AUTH_PROJECT_ID;
    if (!clientId || !projectId) {
      return res.status(500).json({ error: 'server_config_error' });
    }

    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${verifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    const authorizeUrl = new URL(
      `https://api.stack-auth.com/api/v1/${encodeURIComponent(
        projectId
      )}/auth/oauth/authorize/${encodeURIComponent(provider)}`
    );
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid email profile');
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('state', state);

    console.log('/api/auth/oauth', {
      provider,
      host,
      path: req.url,
      state: `...${state.slice(-6)}`,
      challenge: `...${challenge.slice(-6)}`,
    });

    res.writeHead(302, { Location: authorizeUrl.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

