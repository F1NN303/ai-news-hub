(async () => {
  const domain = 'dev-zi3ojkfg51ob4f3c.eu.auth0.com';
  const meta = document.querySelector('meta[name="auth0-client-id"]');
  const clientId = meta ? meta.content : '';
  const redirect_uri = 'https://ai-news-hub-eta.vercel.app/callback.html';
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

  async function handleRedirectCallback() {
    try {
      return await auth0Client.handleRedirectCallback();
    } catch (e) {
      document.body.innerHTML = '<p>Authentication failed.</p><p><a href="/">Back to Home</a></p>';
      throw e;
    }
  }

  window.auth = {
    login: () => auth0Client.loginWithRedirect(),
    logout: () => auth0Client.logout({ logoutParams: { returnTo: 'https://ai-news-hub-eta.vercel.app/' } }),
    getUser: () => auth0Client.getUser(),
    isAuthenticated: () => auth0Client.isAuthenticated(),
    getIdTokenClaims: () => auth0Client.getIdTokenClaims(),
    handleRedirectCallback,
    ready
  };
})();
