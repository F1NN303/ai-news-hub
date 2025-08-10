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
    ensureConfig();

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/callback`);

    // Stack Auth client id = publishable client key
    const clientId =
      process.env.STACK_AUTH_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

    // --- PKCE ---
    const codeVerifier  = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());

    // store verifier short‑lived for the callback
    res.setHeader(
      'Set-Cookie',
      `oauth_code_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`
    );

    const state = b64url(crypto.randomBytes(16));

    // Correct Stack Auth authorize endpoint & params
    const url =
      `https://api.stack-auth.com/api/v1/auth/oauth/authorize` +
      `?provider=${encodeURIComponent(provider)}` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${redirectUri}` +
      `&state=${state}` +
      `&response_type=code` +
      `&scope=openid%20email%20profile` +
      `&code_challenge_method=S256` +
      `&code_challenge=${codeChallenge}`;

    res.writeHead(302, { Location: url });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
