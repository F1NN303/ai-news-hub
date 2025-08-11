const db = require('../../lib/db');
const { verifyToken, signJWT, ensureConfig } = require('../../lib/auth');
const { signSessionToken } = require('../../lib/cookies');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .filter(Boolean)
      .map((c) => {
        const i = c.indexOf('=');
        return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
      })
  );
  const stateCookie = cookies.oauth_state;
  const verifier = cookies.pkce_verifier || '';
  const clearState =
    'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';
  const clearPkce =
    'pkce_verifier=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    ensureConfig([
      'STACK_AUTH_PROJECT_ID',
      'STACK_AUTH_CLIENT_ID',
      'STACK_AUTH_CLIENT_SECRET',
      'SESSION_SECRET',
      'JWKS_URL',
      'JWT_SECRET',
    ]);
    const { state, code, provider } = req.query || {};
    if (!provider) {
      console.error('/api/auth/callback: missing_provider');
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'missing_provider' });
    }
    const stateMatch = Boolean(state && stateCookie && stateCookie === state);
    console.log('/api/auth/callback', { provider, stateMatch });
    if (!stateMatch) {
      console.error('/api/auth/callback: invalid_state');
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_state' });
    }
    if (!code) {
      console.error('/api/auth/callback: invalid_oauth_response');
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;
    const redirectUri = `${baseUrl}/api/auth/callback?provider=${encodeURIComponent(
      provider
    )}`;

    const clientId = process.env.STACK_AUTH_CLIENT_ID;
    const clientSecret = process.env.STACK_AUTH_CLIENT_SECRET;
    const projectId = process.env.STACK_AUTH_PROJECT_ID;

    const tokenUrl = new URL('https://api.stack-auth.com');
    tokenUrl.pathname = `/api/v1/projects/${encodeURIComponent(
      projectId
    )}/auth/oauth/token/${encodeURIComponent(provider)}`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: verifier,
    });

    const tokenRes = await fetch(tokenUrl.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    console.log('/api/auth/callback', {
      provider,
      stateMatch,
      tokenStatus: tokenRes.status,
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      console.error(
        '/api/auth/callback token error',
        tokenRes.status,
        errText.slice(0, 100)
      );
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(502).json({ error: 'token_exchange_failed' });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.token;
    const idToken = tokenData.id_token;
    if (!accessToken && !idToken) {
      console.error('/api/auth/callback: invalid_oauth_response');
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }
    const verifyTarget = idToken || accessToken;

    let payload;
    try {
      payload = await verifyToken(verifyTarget);
    } catch (err) {
      payload = null;
    }
    if (!payload || !payload.sub) {
      console.error('/api/auth/callback: invalid_oauth_response');
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    let { name, email } = payload;
    if ((!email || !name) && accessToken) {
      const infoRes = await fetch(
        'https://api.stack-auth.com/api/v1/auth/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const info = await infoRes.json();
      name = name || info.name;
      email = email || info.email;
    }
    if (!name || !email) {
      console.error('/api/auth/callback: invalid_oauth_response');
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    const { rows } = await db.query(
      `INSERT INTO users(name, email, password_hash, role)
       VALUES($1,$2,'',$3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, email, role`,
      [name, email, 'user']
    );
    const user = rows[0];

    const jwt = await signJWT({
      sub: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });
    const signed = signSessionToken(jwt);
    const sessionCookie = `session=${signed}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`;

    res.setHeader('Set-Cookie', [sessionCookie, clearState, clearPkce]);
    console.log('/api/auth/callback: set session cookie for user', user.id);
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err.message);
    res.setHeader('Set-Cookie', [clearState, clearPkce]);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(400).json({ error: 'invalid_oauth_response' });
  }
};
