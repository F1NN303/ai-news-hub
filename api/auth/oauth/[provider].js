const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

// base64url helper
function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Verifiziert, dass alle benötigten ENV Variablen da sind
    ensureConfig();

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = encodeURIComponent(`${baseUrl}/api/auth/callback`);

    // IDs/Keys aus ENV
    const clientId =
      process.env.STACK_AUTH_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

    const projectId =
      process.env.STACK_AUTH_PROJECT_ID ||
      process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

    // --- PKCE ---
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = b64url(crypto.randomBytes(16));

    // Für den Callback merken
    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    // **Richtiger Endpoint (projekt‑scoped, ohne /auth):**
    const authorize = new URL(
  `https://api.stack-auth.com/api/v1/projects/${process.env.STACK_AUTH_PROJECT_ID}/auth/oauth/authorize`
);
authorize.search = new URLSearchParams({
  provider,                              // "google"
  client_id: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  redirect_uri: `${origin}/api/auth/callback`,
  response_type: "code",
  scope: "openid email profile",
  code_challenge_method: "S256",
  code_challenge: challenge,
  state,
}).toString();

return Response.redirect(authorize.toString(), 302);


    console.log('/api/auth/oauth/[provider]: redirecting to', authorizeUrl);
    res.writeHead(302, { Location: authorizeUrl });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
