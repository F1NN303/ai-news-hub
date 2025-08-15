(() => {
  let auth0Client;
  let authErrorShown = false;
  let signInBtn;
  let signOutBtn;
  let updateAuthUITimer;
  const authDebug = new URLSearchParams(window.location.search).get('auth_debug') === '1';
  const AUDIENCE = document.querySelector('meta[name="auth0-audience"]')?.content;
  
  async function updateAuthUI() {
    if (!window.auth) return;
    const profileLink = document.getElementById('profile-link') || document.getElementById('dashboard-link');
    const profileAvatar = document.getElementById('profile-avatar');
    signInBtn = document.getElementById('sign-in-btn');
    signOutBtn = document.getElementById('sign-out-btn') || document.getElementById('logout-btn');
    const isAuth = await window.auth.isAuthenticated();
    const user = isAuth ? await window.auth.getUser() : null;
    let hasToken = false;
    if (authDebug) {
      try {
        hasToken = !!(await window.auth.getIdTokenClaims());
      } catch (e) {
        hasToken = false;
      }
      console.debug('Auth state', { isAuthenticated: isAuth, hasToken });
    }
    if (signInBtn) {
      signInBtn.classList.toggle('hidden', isAuth);
    }
    if (profileLink) {
      profileLink.classList.toggle('hidden', !isAuth);
    }
    if (profileAvatar) {
      if (isAuth && user && user.picture) {
        profileAvatar.src = user.picture;
        profileAvatar.classList.remove('hidden');
      } else {
        profileAvatar.classList.add('hidden');
        profileAvatar.removeAttribute('src');
      }
    }
    toggleMobileProfileLink(isAuth);
    if (signOutBtn) {
      signOutBtn.onclick = () => window.auth.logout();
    }
  }

  function debouncedUpdateAuthUI() {
    clearTimeout(updateAuthUITimer);
    updateAuthUITimer = setTimeout(updateAuthUI, 100);
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
    if (authDebug) console.debug('Auth0 config', { domain, clientId, redirect_uri, audience: AUDIENCE });
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
          authorizationParams: {
            redirect_uri,
            audience: AUDIENCE,
            scope: 'openid profile email offline_access'
          },
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
      login: () =>
        withClient(() =>
          auth0Client.loginWithRedirect({
            authorizationParams: {
              audience: AUDIENCE,
              scope: 'openid profile email offline_access'
            }
          })
        ),
      logout: () =>
        withClient(() =>
          auth0Client.logout({
            logoutParams: { returnTo: window.location.origin + '/' }
          })
        ),
      getUser: () => withClient(() => auth0Client.getUser(), null),
      isAuthenticated: () => withClient(() => auth0Client.isAuthenticated(), false),
      getIdTokenClaims: () => withClient(() => auth0Client.getIdTokenClaims(), null),
      handleRedirectCallback: () =>
        withClient(async () => {
          const res = await handleRedirectCallbackSafe();
          await refreshAuthState();
          return res;
        })
    };

    async function getApiToken() {
      if (!auth0Client) await window.authReady;
      if (!auth0Client) return null;
      try {
        return await auth0Client.getTokenSilently({
          authorizationParams: { audience: AUDIENCE, scope: 'manage:site' }
        });
      } catch (e) {
        if (authDebug) console.debug('getApiToken failed', e);
        return null;
      }
    }

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

    window.getApiToken = getApiToken;
    window.updateAuthUI = debouncedUpdateAuthUI;
    window.toggleMobileProfileLink = toggleMobileProfileLink;

    window.authReady = window.authReady.then(refreshAuthState);

    return window.authReady;
  };
})();
