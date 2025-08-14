(() => {
  let auth0Client;
  let authErrorShown = false;
  let signInBtn;
  let signOutBtn;
  const authDebug = new URLSearchParams(window.location.search).get('auth_debug') === '1';
  
  async function updateAuthUI() {
    if (!window.auth) return;
    const userNameEl = document.getElementById('user-name');
    const profileLink = document.getElementById('profile-link') || document.getElementById('dashboard-link');
    const isAuth = await window.auth.isAuthenticated();
    let hasToken = false;
    if (authDebug) {
      try {
        hasToken = !!(await window.auth.getIdTokenClaims());
      } catch (e) {
        hasToken = false;
      }
      console.debug('Auth state', { isAuthenticated: isAuth, hasToken });
    }
    if (isAuth) {
      const user = await window.auth.getUser();
      if (userNameEl && user) {
        userNameEl.textContent = user.name || user.email || '';
        userNameEl.classList.remove('hidden');
      }
      if (signInBtn) signInBtn.classList.add('hidden');
      if (signOutBtn) signOutBtn.classList.remove('hidden');
      if (profileLink) profileLink.classList.remove('hidden');
    } else {
      if (userNameEl) userNameEl.classList.add('hidden');
      if (signInBtn) signInBtn.classList.remove('hidden');
      if (signOutBtn) signOutBtn.classList.add('hidden');
      if (profileLink) profileLink.classList.add('hidden');
    }
  }

  function showAuthError() {
    if (authErrorShown) return;
    authErrorShown = true;
    [signInBtn, signOutBtn].forEach(btn => {
      if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
      }
    });
    if (!document.getElementById('auth-error')) {
      const msg = document.createElement('div');
      msg.id = 'auth-error';
      msg.className = 'bg-red-100 text-red-700 p-2 text-center';
      msg.textContent = 'Authentication is currently unavailable. Please try again later.';
      document.body.prepend(msg);
    }
  }

  async function handleRedirectCallbackSafe() {
    try {
      return await auth0Client.handleRedirectCallback();
    } catch (e) {
      document.body.innerHTML = '<p>Authentication failed.</p><p><a href="/">Back to Home</a></p>';
      throw e;
    }
  }

  async function withClient(fn, fallback) {
    await window.authReady;
    if (!auth0Client) {
      showAuthError();
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    return fn();
  }

  window.initAuth = function initAuth() {
    if (window.authReady) return window.authReady;
    if (authDebug) console.debug('initAuth called');
    const domainMeta = document.querySelector('meta[name="auth0-domain"]');
    const domain = domainMeta ? domainMeta.content : (window.AUTH0_DOMAIN || '');
    const clientMeta = document.querySelector('meta[name="auth0-client-id"]');
    const clientId = clientMeta ? clientMeta.content : (window.AUTH0_CLIENT_ID || '');
    const redirect_uri = window.location.origin + '/auth/callback.html';
    if (authDebug) console.debug('Auth0 config', { domain, clientId, redirect_uri });
    signInBtn = document.getElementById('sign-in-btn');
    signOutBtn = document.getElementById('sign-out-btn');
    if (signInBtn) signInBtn.disabled = true;

    window.authReady = (async () => {
      try {
        try {
          await fetch(`https://${domain}/.well-known/health`, { mode: 'cors' });
          if (authDebug) console.debug('Auth0 health check succeeded');
        } catch (e) {
          console.warn(`Auth0 CORS check failed: ${window.location.origin} is not in Allowed Web Origins`);
        }
        const createClientFn =
          typeof createAuth0Client === 'function'
            ? createAuth0Client
            : (window.auth0 && typeof window.auth0.createAuth0Client === 'function'
                ? window.auth0.createAuth0Client
                : null);
        if (!createClientFn) {
          throw new Error('Auth0 SPA SDK not loaded');
        }
        auth0Client = await createClientFn({
          domain,
          clientId,
          authorizationParams: { redirect_uri },
          cacheLocation: 'localstorage',
          useRefreshTokens: true,
          useRefreshTokensFallback: true
        });
        if (authDebug) console.debug('Auth0 client created');
      } catch (e) {
        if (authDebug) console.debug('Auth0 init failed', e);
        console.error('Auth0 init failed', e);
      }
      if (!auth0Client) {
        showAuthError();
        if (authDebug) console.debug('Auth0 client unavailable');
      } else if (signInBtn) {
        signInBtn.disabled = false;
        if (authDebug) console.debug('Auth0 ready');
      }
    })();

    window.auth = {
      login: () => withClient(() => auth0Client.loginWithRedirect()),
      logout: () =>
        withClient(() =>
          auth0Client.logout({
            logoutParams: { returnTo: window.location.origin + '/' }
          })
        ),
      getUser: () => withClient(() => auth0Client.getUser(), null),
      isAuthenticated: () => withClient(() => auth0Client.isAuthenticated(), false),
      getIdTokenClaims: () => withClient(() => auth0Client.getIdTokenClaims(), null),
      handleRedirectCallback: () => withClient(() => handleRedirectCallbackSafe())
    };

    window.updateAuthUI = updateAuthUI;

    return window.authReady;
  };
})();
