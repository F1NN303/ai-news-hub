// api/auth/oauth/[provider].js
const crypto = require('crypto');
const { ensureConfig } = require('../../lib/auth');

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const clearState = 'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearPkce  = 'pkce_verifier=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    ensureConfig(['STACK_AUTH_PROJECT_ID','STACK_AUTH_CLIENT_ID','SESSION_SECRET','JWKS_URL','JWT_SECRET']);

    const provider = req.query.provider;
    if (!provider) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'missing_provider' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;

    const verifier  = b64url(crypto.randomBytes(32));
    const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
    const state     = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${encodeURIComponent(verifier)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
    ]);

    const redirectUri = `${base}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

// --- build Stack Auth authorize URL (v1, non-project) ---
const authorizeUrl = new URL(
  `https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(provider)}`
);
authorizeUrl.searchParams.set('provider', provider);
authorizeUrl.searchParams.set('client_id', process.env.STACK_AUTH_CLIENT_ID);
authorizeUrl.searchParams.set('redirect_uri', redirectUri);
authorizeUrl.searchParams.set('response_type', 'code');
authorizeUrl.searchParams.set('scope', 'openid email profile');
authorizeUrl.searchParams.set('code_challenge_method', 'S256');
authorizeUrl.searchParams.set('code_challenge', challenge);
authorizeUrl.searchParams.set('state', state);

    console.log('/api/auth/oauth', {
      provider, host, path: req.url,
      state: `...${state.slice(-6)}`,
      challenge: `...${challenge.slice(-6)}`
    });

    res.writeHead(302, { Location: authorizeUrl.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    res.setHeader('Set-Cookie', [clearState, clearPkce]);
    res.status(500).json({ error: 'server_error' });
  }
};
