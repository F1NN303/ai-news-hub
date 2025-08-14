(() => {
  let auth0Client;
  let authErrorShown = false;
  let signInBtn;
  let signOutBtn;
  const authDebug = new URLSearchParams(window.location.search).get('auth_debug') === '1';
  
  async function updateAuthUI() {
    if (!window.auth) return;
    const profileLink = document.getElementById('profile-link') || document.getElementById('dashboard-link');
    signInBtn = document.getElementById('sign-in-btn');
    signOutBtn = document.getElementById('sign-out-btn') || document.getElementById('logout-btn');
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
      if (signInBtn) signInBtn.classList.add('hidden');
      if (profileLink) profileLink.classList.remove('hidden');
      toggleMobileProfileLink(true);
    } else {
      if (signInBtn) signInBtn.classList.remove('hidden');
      if (profileLink) profileLink.classList.add('hidden');
      toggleMobileProfileLink(false);
    }
    if (signOutBtn) {
      signOutBtn.onclick = () => window.auth.logout();
    }
  }

  function toggleMobileProfileLink(show) {
    const mobileProfileLink = document.getElementById('profile-link-mobile');
    if (mobileProfileLink) {
      mobileProfileLink.classList.toggle('hidden', !show);
    }
  }

  function showAuthError() {
    if (authErrorShown) return;
    authErrorShown = true;
    if (signInBtn) {
      signInBtn.disabled = true;
      signInBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
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
    window.toggleMobileProfileLink = toggleMobileProfileLink;

    return window.authReady;
  };
})();
