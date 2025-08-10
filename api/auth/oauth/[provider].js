// /api/auth/oauth/[provider].js
const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

// base64url helper
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
    // stellt sicher, dass nötige ENV-Variablen vorhanden sind
    ensureConfig();

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    // Basis-URL (Vercel / Proxy-fähig)
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;
    const redirectUri = `${origin}/api/auth/callback`;

    // ENV: genau diese Namen werden in deinem Projekt bereits benutzt
    const projectId = process.env.STACK_PROJECT_ID; // z.B. bc68070c-....
    const clientId =
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ||
      process.env.STACK_PUBLISHABLE_CLIENT_KEY;

    if (!projectId || !clientId) {
      return res.status(500).json({ error: 'missing_env' });
    }

    // --- PKCE + state ---
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(
      crypto.createHash('sha256').update(verifier).digest()
    );
    const state = b64url(crypto.randomBytes(16));

    // Cookies für Callback merken
    res.setHeader('Set-Cookie', [
      `pkce_verifier=${verifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    // KORREKTER Authorize-Endpoint (projekt-scoped)
    const params = new URLSearchParams({
      provider, // z.B. "google"
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    });

    const authorizeUrl = `https://api.stack-auth.com/api/v1/projects/${projectId}/auth/oauth/authorize?${params.toString()}`;

    // Redirect zum Provider
    res.writeHead(302, { Location: authorizeUrl });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
