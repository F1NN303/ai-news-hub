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
    ensureConfig(['STACK_AUTH_CLIENT_ID', 'STACK_AUTH_PROJECT_ID']);

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(
      provider
    )}`;

    const clientId = process.env.STACK_AUTH_CLIENT_ID;
    const projectId = process.env.STACK_AUTH_PROJECT_ID;

    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${verifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    const url = new URL('https://api.stack-auth.com');
    url.pathname = `/api/v1/projects/${encodeURIComponent(
      projectId
    )}/auth/oauth/authorize/${encodeURIComponent(provider)}`;
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('state', state);

    const authorizeUrl = url.toString();
    const maskedUrl = new URL(authorizeUrl);
    maskedUrl.searchParams.set('code_challenge', `${challenge.slice(0, 6)}...`);
    maskedUrl.searchParams.set('state', `${state.slice(0, 6)}...`);

    console.log('/api/auth/oauth', {
      provider,
      host,
      authorizeUrl: maskedUrl.toString(),
    });

    res.writeHead(302, { Location: authorizeUrl });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};

