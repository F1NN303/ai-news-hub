(() => {
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

  function parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
            .join('')
        );
        return JSON.parse(jsonPayload);
      } catch (e) {
        return {};
      }
    }

    async function refreshAuthState() {
      const isAuthenticated = await window.auth.isAuthenticated();
      let user = null;
      let idTokenClaims = null;
      let apiToken = null;
      if (isAuthenticated) {
        user = await window.auth.getUser();
        try {
          idTokenClaims = await window.auth.getIdTokenClaims();
        } catch (e) {
          idTokenClaims = null;
        }
        apiToken = await getApiToken();
      }

      let isAdmin = false;
      if (apiToken) {
        const { permissions = [] } = parseJwt(apiToken);
        if (Array.isArray(permissions)) {
          isAdmin = permissions.includes('manage:site');
        }
      }
      if (!isAdmin && idTokenClaims) {
        const roles = idTokenClaims['https://ai-news-hub/roles'];
        if (Array.isArray(roles)) {
          isAdmin = roles.includes('admin');
        } else if (typeof roles === 'string') {
          isAdmin = roles.split(' ').includes('admin');
        }
      }

      window.__auth = { user, isAuthenticated, isAdmin, getApiToken };
      document.documentElement.dataset.admin = isAdmin ? 'true' : 'false';
      document.documentElement.dataset.auth = isAuthenticated ? 'true' : 'false';
      document.dispatchEvent(new CustomEvent('auth:ready', { detail: window.__auth }));
      debouncedUpdateAuthUI();
    }

    window.updateAuthUI = debouncedUpdateAuthUI;

    return window.authReady;
  };
  window.initAuth();
})();
