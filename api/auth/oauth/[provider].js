const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Brauchen: Project-ID (bc68…) + Publishable Key (pck_…)
    ensureConfig(['STACK_PROJECT_ID', 'STACK_AUTH_CLIENT_ID']);

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

    const projectId   = process.env.STACK_PROJECT_ID;     // z.B. bc68...
    const publishable = process.env.STACK_AUTH_CLIENT_ID; // pck_...

    // Endpoint
    const url = new URL(`https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(provider)}`);

    // Pflichtfelder
    url.searchParams.set('client_id', projectId);
    url.searchParams.set('client_secret', publishable);         
    url.searchParams.set('grant_type', 'authorization_code');

    // Standard OAuth Felder
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');

    // Immer feste Scopes erzwingen (Short OIDC)
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
