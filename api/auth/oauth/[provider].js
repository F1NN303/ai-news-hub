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
    // Benötigte Umgebungsvariablen
    ensureConfig(['STACK_AUTH_PROJECT_ID', 'STACK_AUTH_CLIENT_ID']);

    const provider = req.query.provider;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    // PKCE + state für die Sicherheit
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`
    ]);

    // Dies sollte Ihr öffentlicher Client-Key sein (beginnt mit pck_)
    const clientId = process.env.STACK_AUTH_CLIENT_ID;

    const url = new URL(`https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(provider)}`);

    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    // WICHTIG: Stellen Sie sicher, dass diese Scopes exakt mit denen
    // in Ihrem Stack Auth Dashboard für diesen Anbieter übereinstimmen.
    url.searchParams.set('scope', 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', state);

    // ENTFERNTE FEHLER:
    // Der `client_secret` und `grant_type` gehören nicht in den Authorize-Request.
    // url.searchParams.set('client_secret', clientSecret); // <--- FEHLER: Entfernen!
    // url.searchParams.set('grant_type', 'authorization_code'); // <--- FEHLER: Entfernen!

    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
