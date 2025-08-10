const { importJWK, jwtVerify } = require('jose');
const { ensureConfig, setSessionCookie, upsertUserByOidc } = require('../../lib/auth');

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
    const { token, code, state } = req.query || {};
    if (!state || !stateCookie || state !== stateCookie) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_state' });
    }

    let idToken = token;
    if (code) {
      const client_id = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
      const client_secret = process.env.STACK_AUTH_SECRET;
      const proto = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const redirect_uri = `${proto}://${host}/api/auth/callback`;
      const resp = await fetch('https://api.stack-auth.com/api/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, client_id, client_secret, redirect_uri }),
      });
      if (!resp.ok) {
        res.setHeader('Set-Cookie', clearState);
        return res.status(400).json({ error: 'token_exchange_failed' });
      }
      const data = await resp.json();
      idToken = data.id_token || data.token;
    }

    if (!idToken) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_oauth_response' });
    }

    const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
    let payload;
    try {
      const resp = await fetch(
        `https://api.stack-auth.com/api/v1/projects/${projectId}/.well-known/jwks.json`
      );
      const { keys } = await resp.json();
      const jwk = keys && keys[0];
      const key = await importJWK(jwk);
      ({ payload } = await jwtVerify(idToken, key));
    } catch (err) {
      console.error('jwt verify error:', err);
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_token' });
    }

    const { sub, email, name, picture } = payload;
    if (!sub) {
      res.setHeader('Set-Cookie', clearState);
      return res.status(400).json({ error: 'invalid_token' });
    }

    const user = await upsertUserByOidc({ sub, email, name, picture });
    await setSessionCookie(res, { userId: user.id, role: user.role });
    const prev = res.getHeader('Set-Cookie');
    res.setHeader(
      'Set-Cookie',
      Array.isArray(prev) ? [...prev, clearState] : [prev, clearState]
    );
    res.writeHead(302, { Location: '/' });
    res.end();
  } catch (err) {
    console.error('/api/auth/callback error:', err);
    res.setHeader('Set-Cookie', clearState);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
