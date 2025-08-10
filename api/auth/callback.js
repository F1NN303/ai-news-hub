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
      .map(c => {
        const i = c.indexOf('=');
        return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1))];
      })
  );
  const stateCookie = cookies.oauth_state;
  const clearState = 'oauth_state=; Max-Age=0; HttpOnly; Secure; SameSite=Strict; Path=/';

  try {
    ensureConfig();
    const { state, token } = req.query || {};
    if (!state || !stateCookie || stateCookie !== state) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_state' });
    }
    if (!token) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    let payload;
    try {
      payload = await verifyToken(token);
    } catch (err) {
      payload = null;
    }
    if (!payload || !payload.sub || !payload.name) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    const id = parseInt(payload.sub, 10);
    if (Number.isNaN(id)) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }
    const name = payload.name || '';
    const email = payload.email || '';

    const { rows } = await db.query(
      `INSERT INTO users(id, name, email, password_hash, role)
       VALUES($1,$2,$3,'',$4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
       RETURNING id, name, email, role`,
      [id, name, email, 'user']
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

    res.setHeader('Set-Cookie', [sessionCookie, clearState]);
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err);
    res.setHeader('Set-Cookie', clearState);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(400).json({ error: 'invalid_oauth_response' });
  }
};
