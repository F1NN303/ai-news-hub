const { getSession } = require('@auth0/nextjs-auth0');
const { ensureCsrf } = require('../../lib/csrf');

module.exports = (req, res) => {
  ensureCsrf(req, res);
  const session = getSession(req, res);
  if (!session || !session.user) {
    return res.status(401).end();
  }
  const { id, name, email } = session.user;
  return res.status(200).json({ id, name, email });
};
