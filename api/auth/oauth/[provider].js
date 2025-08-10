// /api/auth/oauth/[provider].js
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
    ensureConfig(); // throws if env is missing

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;

    // pull from env (publishable is safe for client; still fine here)
    const projectId  = process.env.STACK_AUTH_PROJECT_ID || process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    const clientId   = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

    if (!projectId || !clientId) {
      return res.status(500).json({ error: 'server_config_error' });
    }

    // PKCE
    const codeVerifier  = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state         = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    // Correct, project-scoped Stack Auth authorize endpoint
    const authorizeUrl =
      `https://api.stack-auth.com/api/v1/projects/${projectId}/auth/oauth/authorize` +
      `?provider=${encodeURIComponent(provider)}` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=${encodeURIComponent('openid email profile')}` +
      `&code_challenge_method=S256&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&state=${encodeURIComponent(state)}`;

    res.writeHead(302, { Location: authorizeUrl });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
