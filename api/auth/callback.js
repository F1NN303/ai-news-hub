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
    ensureConfig();
    const { state, code, provider } = req.query || {};
    console.log('/api/auth/callback: query', { state, code, provider });
    if (!state || !stateCookie || stateCookie !== state) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_state' });
    }
    if (!code) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const baseUrl = `${proto}://${host}`;

    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    const serverSecret = process.env.STACK_SECRET_KEY;

    const tokenRes = await fetch(
      `https://api.stack-auth.com/api/v1/auth/oauth/token/${provider}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: projectId,
          client_secret: serverSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${baseUrl}/api/auth/callback`,
          code_verifier: verifier,
        }),
      }
    );
    const tokenData = await tokenRes.json();
    console.log('/api/auth/callback: tokenData', tokenData);
    const token = tokenData.token;

    let payload;
    try {
      payload = await verifyToken(token);
    } catch (err) {
      payload = null;
    }
    if (!payload || !payload.sub) {
      res.setHeader('Set-Cookie', [clearState, clearPkce]);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    let { name, email } = payload;
    if (!email || !name) {
      const infoRes = await fetch(
        'https://api.stack-auth.com/api/v1/auth/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const info = await infoRes.json();
      name = name || info.name;
      email = email || info.email;
    }
    if (!name || !email) {
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
    console.error('/api/auth/callback error:', err);
    res.setHeader('Set-Cookie', [clearState, clearPkce]);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(400).json({ error: 'invalid_oauth_response' });
  }
};
