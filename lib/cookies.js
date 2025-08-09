function getSessionToken(req) {
  const cookieHeader = req?.headers?.cookie || '';
  const session = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='));
  if (!session) return null;
  const token = session.slice('session='.length);
  return token || null;
}

module.exports = { getSessionToken };
