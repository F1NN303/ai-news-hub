// api/auth/oauth/[provider].js
const crypto = require('crypto');
const { ensureConfig } = require('../../lib/auth');

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // temp cookies we set for the round-trip
  const clearState =
    'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearPkce =
    'pkce_verifier=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    // Require the Stack Auth envs; ensureConfig allows JWKS_URL **or** JWT_SECRET
    ensureConfig([
      'STACK_PROJECT_ID',
      'STACK_AUTH_CLIENT_ID',
      'STACK_SECRET_KEY',
      'SESSION_SECRET',
      'JWKS_URL',
      'JWT_SECRET',
    ]);

    const provider = req.query.provider;
    if (!provider) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'missing_provider' });
    }

    // --- derive our public base url (works on Vercel) ---
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    // --- PKCE + state ---
    const verifier = b64url(crypto.randomBytes(32));
    const challenge = b64url(
      crypto.createHash('sha256').update(verifier).digest(),
    );
    const state = b64url(crypto.randomBytes(16));

    // persist temp values
    res.setHeader('Set-Cookie', [
      `pkce_verifier=${encodeURIComponent(
        verifier,
      )}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${encodeURIComponent(
        state,
      )}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    // Our callback includes the provider so the callback doesn't need to guess it
    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(
      provider,
    )}`;

    // --- build Stack Auth authorize URL ---
    const authorizeUrl = new URL(
      'https://api.stack-auth.com/api/v1/auth/oauth/authorize',
    );
    authorizeUrl.searchParams.set('provider', provider);
    authorizeUrl.searchParams.set(
      'client_id',
      process.env.STACK_AUTH_CLIENT_ID,
    );
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('scope', 'openid email profile');
    authorizeUrl.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl.searchParams.set('code_challenge', challenge);
    authorizeUrl.searchParams.set('state', state);

    // log final authorize URL (masking sensitive params)
    const logUrl = new URL(authorizeUrl.toString());
    logUrl.searchParams.set('code_challenge', '***');
    logUrl.searchParams.set('state', '***');
    console.log('/api/auth/oauth', { provider, url: logUrl.toString() });

    res.writeHead(302, { Location: authorizeUrl.toString() });
    return res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    res.setHeader('Set-Cookie', [clearState, clearPkce]);
    return res.status(500).json({ error: 'server_error' });
  }
};

