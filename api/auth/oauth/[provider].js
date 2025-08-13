// pages/api/auth/oauth/[provider].js
const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-')
    .replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Must exist in your env (Vercel):
    // STACK_AUTH_PROJECT_ID  -> bc68070c-....
    // STACK_AUTH_CLIENT_ID   -> pck_....
    ensureConfig(['STACK_AUTH_PROJECT_ID', 'STACK_AUTH_CLIENT_ID']);

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    // Build redirectUri exactly as configured in Stack Auth provider settings
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;
    const redirectUri =
      `${base}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    // PKCE + state
    const verifier  = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state     = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${verifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
    ]);

    const projectId = process.env.STACK_AUTH_PROJECT_ID; // bc68070c-...
    const clientId  = process.env.STACK_AUTH_CLIENT_ID;  // pck_...

    // ✅ Project‑scoped authorize URL (this was the missing piece)
    const url = new URL(
      `https://api.stack-auth.com/api/v1/projects/${encodeURIComponent(projectId)}` +
      `/auth/oauth/authorize/${encodeURIComponent(provider)}`
    );

    // Allowed query params for /authorize
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');

    // Scopes MUST MATCH your Stack Auth provider config
    url.searchParams.set('scope', 'openid email profile');
    // If your provider in Stack Auth uses Google’s long scopes, use this instead:
    // url.searchParams.set('scope',
    //   'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
    // );

    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('state', state);

    // ❌ Do NOT send client_secret or grant_type here (only in /token exchange).
    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
