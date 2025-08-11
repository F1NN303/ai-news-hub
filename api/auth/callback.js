/* api/auth/callback.js */

const db = require('../../lib/db');
const { verifyToken, signJWT, ensureConfig } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // ---- read cookies ----
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf('=');
        return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
      })
  );
  const stateCookie = cookies.oauth_state || '';
  const verifier = cookies.pkce_verifier || '';

  const clearState =
    'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearPkce =
    'pkce_verifier=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearProvider =
    'oauth_provider=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    // required envs; lib/auth.ensureConfig erlaubt JWKS_URL **oder** JWT_SECRET
    ensureConfig([
      'STACK_PROJECT_ID',
      'STACK_AUTH_CLIENT_ID',
      'STACK_SECRET_KEY',
      'SESSION_SECRET',
      'JWKS_URL',
      'JWT_SECRET',
    ]);

    // ---- read query ----
    const { state, code } = req.query || {};
    let provider = (req.query && req.query.provider) || cookies.oauth_provider;

    if (!provider) {
      console.error('/api/auth/callback: missing_provider');
      res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider]);
      return res.status(400).json({ error: 'missing_provider' });
    }
    if (!code) {
      console.error('/api/auth/callback: missing_code');
      res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider]);
      return res.status(400).json({ error: 'missing_code' });
    }

    const stateMatch = Boolean(state && stateCookie && stateCookie === state);
    console.log('/api/auth/callback', {
      provider,
      stateMatch,
    });

    if (!stateMatch) {
      console.error('/api/auth/callback: invalid_state');
      res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider]);
      return res.status(400).json({ error: 'invalid_state' });
    }

    // ---- derive redirect_uri exactly as used in authorize step ----
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(
      provider,
    )}`;

    console.log('/api/auth/callback redirect', {
      provider,
      hasCode: Boolean(code),
      hasVerifier: Boolean(verifier),
      redirectUri,
    });

    // ---- token exchange ----
    const tokenUrl = `https://api.stack-auth.com/api/v1/projects/${encodeURIComponent(
      process.env.STACK_PROJECT_ID,
    )}/auth/oauth/token/${encodeURIComponent(provider)}`;

    const body = new URLSearchParams({
      client_id: process.env.STACK_AUTH_CLIENT_ID,
      client_secret: process.env.STACK_SECRET_KEY,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: verifier,
      code,
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '');
      console.error('/api/auth/callback: token_exchange_failed', {
        provider,
        status: tokenRes.status,
        bodyPreview: text.slice(0, 200),
      });
      res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider]);
      return res.status(502).json({ error: 'token_exchange_failed' });
    }

    const tokens = await tokenRes.json();

    // ---- verify / create session (keep as in your app) ----
    // Prefer id_token if available; otherwise use access_token
    const raw = tokens.id_token || tokens.access_token;
    const user = await verifyToken(raw).catch(() => null);
    if (!user) {
      console.error('/api/auth/callback: token_verification_failed');
      res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider]);
      return res.status(401).json({ error: 'token_verification_failed' });
    }

    // create your app session (adjust if your helpers differ)
    const sessionJwt = await signJWT(
      { sub: user.sub, email: user.email },
      { expiresIn: '7d' }
    );
    const sessionCookie = signSessionToken(sessionJwt);

    // clear temp cookies & set session
    res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider, sessionCookie]);

    // success -> home
    res.writeHead(302, { Location: '/' });
    return res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err);
    res.setHeader('Set-Cookie', [clearState, clearPkce, clearProvider]);
    return res.status(500).json({ error: 'server_error' });
  }
};