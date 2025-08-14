(async () => {
  const domainMeta = document.querySelector('meta[name="auth0-domain"]');
  const domain = domainMeta ? domainMeta.content : (window.AUTH0_DOMAIN || '');
  const clientMeta = document.querySelector('meta[name="auth0-client-id"]');
  const clientId = clientMeta ? clientMeta.content : (window.AUTH0_CLIENT_ID || '');
  const redirect_uri = window.location.origin + '/auth/callback.html';
  let auth0Client;
  const ready = (async () => {
    try {
      auth0Client = await createAuth0Client({
        domain,
        clientId,
        authorizationParams: { redirect_uri }
      });
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

  window.auth = {
    login: () => withClient(() => auth0Client.loginWithRedirect()),
    logout: () =>
      withClient(() =>
        auth0Client.logout({
          logoutParams: { returnTo: window.location.origin + '/' }
        })
      ),
    getUser: () => withClient(() => auth0Client.getUser()),
    isAuthenticated: () => withClient(() => auth0Client.isAuthenticated()),
    getIdTokenClaims: () => withClient(() => auth0Client.getIdTokenClaims()),
    handleRedirectCallback: () => withClient(() => handleRedirectCallbackSafe()),
    ready
  };
})();
