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
    ensureConfig([
      'STACK_AUTH_CLIENT_ID', // wird hier als Google Client ID benutzt
      'STACK_AUTH_CLIENT_SECRET' // Google Client Secret
    ]);

    const provider = req.query.provider;
    if (provider !== 'google') {
      return res.status(400).json({ error: 'invalid_provider' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const redirectUri = `${baseUrl}/api/auth/callback?provider=google`;

    // PKCE
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(
      crypto.createHash('sha256').update(codeVerifier).digest()
    );
    const state = b64url(crypto.randomBytes(16));

    res.setHeader('Set-Cookie', [
      `pkce_verifier=${codeVerifier}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`,
      `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`
    ]);

    const clientId = process.env.STACK_AUTH_CLIENT_ID;
    const scope = [
      'openid',
      'email',
      'profile'
    ].join(' ');

    const url = new URL(`https://accounts.google.com/o/oauth2/v2/auth`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('state', state);
    url.searchParams.set('access_type', 'offline'); // für Refresh Tokens

    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/oauth/[provider] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
