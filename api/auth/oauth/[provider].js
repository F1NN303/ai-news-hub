const crypto = require('node:crypto');
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
    ensureConfig();

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    // Callback on our app
    const redirectUri = `${baseUrl}/api/auth/callback`;

    // Stack Auth IDs
    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID; // <-- wichtig!
    const clientId =
      process.env.STACK_AUTH_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

    // --- PKCE ---
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = b64url(crypto.randomBytes(16));

    // persist verifier and state for the callback
    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    // Correct Stack Auth authorize endpoint (mit /projects/<id>)
    const url = new URL(`https://api.stack-auth.com/api/v1/projects/${projectId}/auth/oauth/authorize`);
    url.searchParams.set('provider', provider);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);

    console.log('/api/auth/oauth/[provider]: redirect ->', url.toString());

    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
