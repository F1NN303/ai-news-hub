const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

// base64url helper
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // IMPORTANT: which envs we actually use
    // - STACK_AUTH_PROJECT_ID -> your project UUID (bc68070c-....)
    // - STACK_AUTH_CLIENT_ID  -> your publishable client key (starts with pck_)
    ensureConfig(['STACK_AUTH_PROJECT_ID', 'STACK_AUTH_CLIENT_ID']);

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    // PKCE
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    const clientId     = process.env.STACK_AUTH_PROJECT_ID;   // <- project UUID
    const clientSecret = process.env.STACK_AUTH_CLIENT_ID;    // <- publishable client key (pck_...)

    // Correct authorize endpoint (provider in the path) and ONLY standard OIDC scopes
    const url = new URL(`https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(provider)}`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');  // keep exactly these
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', state);

    // NOTE: do NOT send grant_type on authorize step
    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
