/* api/auth/callback.js */
const db = require('../../lib/db');
const { verifyToken, signJWT, ensureConfig } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
      const i = c.indexOf('=');
      return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
    })
  );
  const stateCookie = cookies.oauth_state || '';
  const verifier    = cookies.pkce_verifier || '';

  const clearState = 'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearPkce  = 'pkce_verifier=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    ensureConfig(['STACK_AUTH_PROJECT_ID','STACK_AUTH_CLIENT_ID','STACK_AUTH_CLIENT_SECRET','SESSION_SECRET','JWKS_URL','JWT_SECRET']);

    const { state, code, provider } = req.query || {};
    if (!provider) { res.setHeader('Set-Cookie', [clearState, clearPkce]); return res.status(400).json({ error:'missing_provider' }); }
    if (!code)     { res.setHeader('Set-Cookie', [clearState, clearPkce]); return res.status(400).json({ error:'missing_code' }); }

    const stateMatch = Boolean(state && stateCookie && stateCookie === state);
    if (!stateMatch) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_state' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;
    const redirectUri = `${base}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

   // ---- token exchange (v1, non-project) ----
const tokenUrl = `https://api.stack-auth.com/api/v1/projects/${STACK_AUTH_PROJECT_ID}/auth/oauth/token/${provider}
`;

const body = new URLSearchParams({
  client_id: process.env.STACK_AUTH_CLIENT_ID,
  client_secret: process.env.STACK_AUTH_CLIENT_SECRET,
  grant_type: 'authorization_code',
  redirect_uri: redirectUri,
  code_verifier: verifier,
  code,
});


    const tokenRes = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(()=>'');
      console.error('/api/auth/callback: token_exchange_failed', { status: tokenRes.status, bodyPreview: text.slice(0,200) });
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(502).json({ error: 'token_exchange_failed' });
    }

    const tokens = await tokenRes.json();
    const raw = tokens.id_token || tokens.access_token;
    const user = await verifyToken(raw).catch(() => null);
    if (!user) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(401).json({ error: 'token_verification_failed' });
    }

    const sessionJwt = await signJWT({ sub: user.sub, email: user.email }, '7d');
    const sessionCookie = signSessionToken(sessionJwt);

    res.setHeader('Set-Cookie', [clearState, clearPkce, sessionCookie]);
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err);
    res.setHeader('Set-Cookie', [clearState, clearPkce]);
    res.status(500).json({ error: 'server_error' });
  }
};
