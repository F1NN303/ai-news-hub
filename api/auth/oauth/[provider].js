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
    // Required env vars:
    // - STACK_AUTH_PROJECT_ID  => your Stack Auth Project ID (UUID like bc6807... )
    // - STACK_AUTH_CLIENT_ID   => your Publishable Client Key (starts with pck_)
    ensureConfig(['STACK_AUTH_PROJECT_ID', 'STACK_AUTH_CLIENT_ID']);

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    // We include provider in the callback query so the callback knows which flow this was
    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    // PKCE + state
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    ]);

    const clientId     = process.env.STACK_AUTH_PROJECT_ID; // project UUID
    const clientSecret = process.env.STACK_AUTH_CLIENT_ID;  // publishable pck_ key

    // Correct Stack Auth authorize endpoint (provider in the path)
    const url = new URL(`https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(provider)}`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('https://www.googleapis.com/auth/userinfo.profile+openid+https://www.googleapis.com/auth/userinfo.email"'); // keep EXACTLY these; they must match your provider config
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', state);
    // ← This fixes your current error:
    url.searchParams.set('grant_type', 'authorization_code');

    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
