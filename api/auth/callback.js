const db = require('../../lib/db');
const { verifyToken, signJWT, ensureConfig } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // read cookies
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
  const verifier    = cookies.pkce_verifier || '';
  const clearState  = 'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearPkce   = 'pkce_verifier=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    // MUST be set in Vercel:
    // STACK_AUTH_PROJECT_ID = project id (UUID)
    // STACK_SECRET_KEY      = server secret key (sk_...)
    // JWKS_URL              = https://api.stack-auth.com/api/v1/projects/<PROJECT_ID>/.well-known/jwks.json
    // JWT_SECRET            = your app’s signing secret for your own session JWT (already used in repo)
    ensureConfig(['STACK_AUTH_PROJECT_ID', 'STACK_SECRET_KEY', 'JWKS_URL', 'JWT_SECRET']);

    const { state, code, provider } = req.query || {};
    if (!provider) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'missing_provider' });
    }
    if (!state || state !== stateCookie) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_state' });
    }
    if (!code) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const base  = `${proto}://${host}`;
    const redirectUri = `${base}/api/auth/callback?provider=${encodeURIComponent(provider)}`;

    const projectId   = process.env.STACK_AUTH_PROJECT_ID;
    const serverKey   = process.env.STACK_SECRET_KEY; // sk_... (server secret)

    // Exchange code for Stack token
    const tokenRes = await fetch(`https://api.stack-auth.com/api/v1/auth/oauth/token/${encodeURIComponent(provider)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: projectId,
        client_secret: serverKey,          // server secret used here
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text().catch(() => '');
      console.error('token exchange failed', tokenRes.status, text);
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'token_exchange_failed', status: tokenRes.status });
    }

    const tokenData = await tokenRes.json();
    const token = tokenData?.token;
    if (!token) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_token_response' });
    }

    // Verify Stack ID token via JWKS
    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      payload = null;
    }
    if (!payload?.sub) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_id_token' });
    }

    // Fallback to userinfo if name/email missing
    let { name, email } = payload;
    if (!name || !email) {
      const infoRes = await fetch('https://api.stack-auth.com/api/v1/auth/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const info = await infoRes.json().catch(() => ({}));
      name = name || info.name;
      email = email || info.email;
    }
    if (!name || !email) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'incomplete_profile' });
    }

    // Upsert local user
    const { rows } = await db.query(
      `INSERT INTO users(name, email, password_hash, role)
       VALUES($1,$2,'',$3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, email, role`,
      [name, email, 'user']
    );
    const user = rows[0];

    // Issue app session
    const jwt = await signJWT({ sub: String(user.id), email: user.email, name: user.name, role: user.role });
    const signed = signSessionToken(jwt);
    const sessionCookie = `session=${signed}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`;

    res.setHeader('Set-Cookie', [sessionCookie, clearState, clearPkce]);
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err);
    res.setHeader('Set-Cookie', [clearState, clearPkce]);
    return res.status(500).json({ error: 'server_error' });
  }
};
