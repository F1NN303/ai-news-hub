module.exports = (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const keys = [
    'STACK_AUTH_PROJECT_ID',
    'STACK_AUTH_CLIENT_ID',
    'STACK_AUTH_CLIENT_SECRET',
    'DATABASE_URL',
    'JWKS_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
  ];
  const info = {};
  for (const k of keys) {
    info[k] = !!process.env[k];
  }
  info.NEXT_PUBLIC_HAS_OAUTH = process.env.NEXT_PUBLIC_HAS_OAUTH === 'true';
  return res.status(200).json(info);
};
