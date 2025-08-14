(async () => {
  const cfg = window.__auth0 || {};
  const domain = cfg.domain || 'dev-zi3ojkfg51ob4f3c.eu.auth0.com';
  const clientId = cfg.clientId || (document.querySelector('meta[name="auth0-client-id"]')?.content || '');
  const baseUrl = (cfg.baseUrl || window.location.origin).replace(/\/$/, '');
  const redirect_uri = baseUrl + '/auth/callback.html';
  let auth0Client;
  const ready = (async () => {
    try {
      auth0Client = await createAuth0Client({
        domain,
        clientId,
        authorizationParams: { redirect_uri }
      });
      window.auth0Client = auth0Client;
      return auth0Client;
    } catch (e) {
      console.error('Auth0 init failed', e);
    }
  })();

  async function handleRedirectCallbackSafe() {
    try {
      return await auth0Client.handleRedirectCallback();
    } catch (e) {
      document.body.innerHTML = '<p>Authentication failed.</p><p><a href="/">Back to Home</a></p>';
      throw e;
    }
  }

  async function withClient(fn) {
    await ready;
    return fn();
  }

  window.auth0ClientPromise = ready;
  window.auth = {
    login: () => withClient(() => auth0Client.loginWithRedirect({ authorizationParams: { redirect_uri } })),
    logout: () => withClient(() => auth0Client.logout({ logoutParams: { returnTo: baseUrl + '/' } })),
    getUser: () => withClient(() => auth0Client.getUser()),
    isAuthenticated: () => withClient(() => auth0Client.isAuthenticated()),
    getIdTokenClaims: () => withClient(() => auth0Client.getIdTokenClaims()),
    handleRedirectCallback: () => withClient(() => handleRedirectCallbackSafe()),
    ready
  };
})();
