const base = process.env.STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';

module.exports = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const proto = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
  const host = req.headers.host;
  const redirect_uri = `${proto}://${host}/api/auth/callback`;

  try {
    const tokenRes = await fetch(`${base}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        project_id: process.env.STACK_AUTH_PROJECT_ID,
        client_id: process.env.STACK_AUTH_CLIENT_ID,
        redirect_uri
      })
    });

    const data = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(500).json(data);
    }

    const { access_token, expires_in } = data;
    const maxAge = expires_in || 3600;
    res.setHeader('Set-Cookie', `session=${access_token}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}; Path=/`);
    res.writeHead(302, { Location: '/' }).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TOKEN_EXCHANGE_FAILED' });
  }
};
