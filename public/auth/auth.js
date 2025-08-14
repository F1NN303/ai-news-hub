(async () => {
  const domain = 'dev-zi3ojkfg51ob4f3c.eu.auth0.com';
  const clientId = document.querySelector('meta[name="auth0-client-id"]')?.content || '';
  const baseUrl = 'https://ai-news-hub-eta.vercel.app';
  const redirect_uri = baseUrl + '/callback.html';
  let client;
  const ready = (async () => {
    try {
      client = await createAuth0Client({
        domain,
        clientId,
        authorizationParams: { redirect_uri }
      });
      return client;
    } catch (err) {
      console.error('auth init failed', err);
    }
  })();

  async function withClient(fn) {
    await ready;
    return fn();
  }

  async function handleRedirectCallback() {
    try {
      await withClient(() => client.handleRedirectCallback());
    } catch (err) {
      document.body.innerHTML = '<p>Authentication failed.</p><p><a href="/">Back to Home</a></p>';
      throw err;
    }
  }

  window.auth = {
    login: () => withClient(() => client.loginWithRedirect()),
    logout: () => withClient(() => client.logout({ logoutParams: { returnTo: baseUrl + '/' } })),
    getUser: () => withClient(() => client.getUser()),
    isAuthenticated: () => withClient(() => client.isAuthenticated()),
    getIdTokenClaims: () => withClient(() => client.getIdTokenClaims()),
    handleRedirectCallback,
    ready
  };
})();
