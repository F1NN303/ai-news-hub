const crypto = require('node:crypto');
const { ensureConfig } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  try {
    ensureConfig();
    const clientId = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const redirectUri = `${proto}://${host}/api/auth/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    const cookie = `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=600`;
    res.setHeader('Set-Cookie', cookie);
    const url = new URL('https://api.stack-auth.com/api/v1/auth/authorize');
    url.searchParams.set('provider', 'google');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    console.log(
      'login authorize ->',
      url.toString().replace(/client_id=[^&]+/, 'client_id=***')
    );
    res.writeHead(302, { Location: url.toString() });
    res.end();
  } catch (err) {
    console.error('/api/auth/login error:', err);
    if (err.code === 'CONFIG_ERROR') {
      return res.status(500).json({ error: 'missing_config' });
    }
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
};
