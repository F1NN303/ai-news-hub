const crypto = require('node:crypto');
const { ensureConfig } = require('../../../lib/auth');

// helper: base64url (RFC 4648 §5)
function b64url(buf) {
  return buf
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

  try {
    ensureConfig();
    const provider = req.query.provider;
    if (!provider) {
      return res.status(400).json({ error: 'missing_provider' });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback`;

    // ⚠️ NEW: PKCE
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(
      crypto.createHash('sha256').update(codeVerifier).digest()
    );

    // store verifier in a short‑lived, HttpOnly cookie for the callback to read
    const pkceCookie =
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`;

    // your Stack Auth project + publishable key
    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID || '';
    const publishableId = process.env.STACK_AUTH_CLIENT_ID || '';

    const url = new URL(
      `https://api.stack-auth.com/api/v1/auth/oauth/authorize/${encodeURIComponent(
        provider
      )}`
    );
    url.searchParams.set('client_id', projectId);
    url.searchParams.set('client_secret', publishableId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('grant_type', 'authorization_code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', state);

    const cookie =
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Max-Age=600; Path=/`;
    res.setHeader('Set-Cookie', [pkceCookie, cookie]);
    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
