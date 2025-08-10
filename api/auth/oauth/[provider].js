const crypto = require('crypto');
const { ensureConfig } = require('../../../lib/auth');

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
    const redirectUri = `${baseUrl}/api/auth/callback`;

    const clientId =
      process.env.STACK_AUTH_CLIENT_ID ||
      process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;

    if (!clientId) {
      return res.status(500).json({ error: 'missing_client_id' });
    }

    // PKCE + state
    const codeVerifier  = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(crypto.createHash('sha256').update(codeVerifier).digest());
    const state         = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    const authorizeUrl = new URL('https://api.stack-auth.com/api/v1/oauth/authorize');
    authorizeUrl.searchParams.set('provider', provider);         // e.g. "google"
    authorizeUrl.searchParams.set('client_id', clientId);        // pck_...
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid email profile');
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('code_challenge', codeChallenge);

    console.log('/api/auth/oauth/[provider]: redirecting to', authorizeUrl.toString());
    res.writeHead(302, { Location: authorizeUrl.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
