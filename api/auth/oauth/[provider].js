// pages/api/auth/oauth/[provider].js
const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

function b64url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Only the publishable client key (pck_...) is required for /authorize
    ensureConfig(['STACK_AUTH_CLIENT_ID']);

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;
    const redirectUri = `${base}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    // PKCE + state
    const verifier  = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state     = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    ]);

    const clientId = process.env.STACK_AUTH_CLIENT_ID; // pck_…

    // Correct global authorize endpoint (no /projects/... and no client_secret/grant_type here)
    const url = new URL(
      `https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(provider)}`
    );

    // Required params
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');

    // Scopes MUST be OIDC short form to avoid "Invalid scope"
    // Do NOT use the long Google URLs here.
    url.searchParams.set('scope', 'openid email profile');

    // PKCE
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('state', state);

    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
