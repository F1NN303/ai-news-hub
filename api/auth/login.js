const base = process.env.STACK_AUTH_BASE_URL || 'https://api.stack-auth.com';

module.exports = (req, res) => {
  const provider = req.query.provider || 'github';
  const proto = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
  const host = req.headers.host;
  const redirect_uri = `${proto}://${host}/api/auth/callback`;

  const url = new URL(`${base}/api/v1/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('project_id', process.env.STACK_AUTH_PROJECT_ID);
  url.searchParams.set('client_id', process.env.STACK_AUTH_CLIENT_ID);
  url.searchParams.set('provider', provider);
  url.searchParams.set('redirect_uri', redirect_uri);

  res.status(302);
  res.setHeader('Location', url.toString());
  res.end();
};
