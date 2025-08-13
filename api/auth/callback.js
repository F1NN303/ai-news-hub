// pages/api/auth/callback.js
const { ensureConfig } = require('../../../lib/auth');
const { parse } = require('cookie');

/**
 * Notes (Shared keys OFF):
 * - /authorize: no secret, no grant_type (done in [provider].js)
 * - /token (this file): include client_secret + grant_type=authorization_code
 *
 * Required env on Vercel:
 *   STACK_AUTH_CLIENT_ID     // pck_... (Publishable Client Key)
 *   STACK_AUTH_CLIENT_SECRET // ssk_... (Server Key)
 */
module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    ensureConfig(['STACK_AUTH_CLIENT_ID', 'STACK_AUTH_CLIENT_SECRET']);

    const { code, state, provider } = req.query;
    if (!provider) return res.status(400).json({ error: 'missing_provider' });
    if (!code) return res.status(400).json({ error: 'missing_code' });
    if (!state) return res.status(400).json({ error: 'missing_state' });

    // Read & clear PKCE + state from cookies
    const cookies = parse(req.headers.cookie || '');

    const cookieState = cookies['oauth_state'];
    const codeVerifier = cookies['pkce_verifier'];

    if (!cookieState || !codeVerifier) {
      return res.status(400).json({ error: 'missing_pkce_or_state' });
    }
    if (cookieState !== state) {
      return res.status(400).json({ error: 'state_mismatch' });
    }

    // Build redirectUri exactly like in [provider].js
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;
    const redirectUri = `${base}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    // Exchange authorization code for tokens at Stack Auth
    const client_id     = process.env.STACK_AUTH_CLIENT_ID;     // pck_...
    const client_secret = process.env.STACK_AUTH_CLIENT_SECRET; // ssk_...

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id,
      client_secret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    });

    const tokenRes = await fetch('https://api.stack-auth.com/api/v1/auth/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body
    });

    // Helpful error bubble‑up if Stack Auth rejects our request
    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      console.error('Stack Auth /token error', tokenRes.status, errJson);
      return res.status(502).json({
        error: 'token_exchange_failed',
        status: tokenRes.status,
        details: errJson
      });
    }

    const tokenJson = await tokenRes.json();
    // tokenJson typically includes: access_token, id_token, refresh_token?, token_type, expires_in, user, etc.

    // OPTIONAL: integrate with your existing session util if present.
    // If you have something like setSessionCookie or signSessionToken in lib/auth, prefer that.
    let sessionCookieSet = false;
    try {
      const { setSessionCookie } = require('../../../lib/auth');
      if (typeof setSessionCookie === 'function') {
        await setSessionCookie(res, tokenJson);
        sessionCookieSet = true;
      }
    } catch (_) { /* no-op: fallback below */ }

    // Fallback: set a secure, httpOnly cookie with the access token (adjust to your needs)
    if (!sessionCookieSet && tokenJson.access_token) {
      const maxAge = Math.max(60, Number(tokenJson.expires_in || 3600));
      res.setHeader('Set-Cookie', [
        `stack_access_token=${encodeURIComponent(tokenJson.access_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`,
        // Clear the temporary PKCE/state cookies
        'pkce_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
      ]);
    } else {
      // Clear PKCE/state even if a custom session util handled cookies
      res.setHeader('Set-Cookie', [
        'pkce_verifier=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0',
        'oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
      ]);
    }

    // Redirect to the app (adjust if you have a post-login path)
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
};
