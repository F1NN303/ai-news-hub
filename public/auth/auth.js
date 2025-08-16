(() => {
  let auth0Client;
  let authErrorShown = false;
  let signInBtn;
  let signOutBtn;
  let updateAuthUITimer;
  const authDebug = new URLSearchParams(window.location.search).get('auth_debug') === '1';
  const audMeta = document.querySelector('meta[name="auth0-audience"]');
  const AUDIENCE = audMeta ? audMeta.content : '';

  let authReadyResolve,
    authReadyReject;
  window.authReady = new Promise((resolve, reject) => {
    authReadyResolve = resolve;
    authReadyReject = reject;
  });

  async function getApiToken() {
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

  window.auth = {
    login: () => showAuthError(),
    logout: () => showAuthError(),
    getUser: () => null,
    isAuthenticated: () => false,
    getIdTokenClaims: () => null,
    getApiToken,
    handleRedirectCallback: () => {
      showAuthError();
      return Promise.reject(new Error('Auth not available'));
    }
  };

  function finalizeAuthState() {
    window.__auth = { user: null, isAuthenticated: false, isAdmin: false, getApiToken };
    document.documentElement.dataset.admin = 'false';
    document.documentElement.dataset.auth = 'false';
    document.dispatchEvent(new CustomEvent('auth:ready', { detail: window.__auth }));
    debouncedUpdateAuthUI();
  }
  
  async function updateAuthUI() {
    if (!window.auth) return;
    const profileAvatar = document.getElementById('profile-avatar');
    signInBtn = document.getElementById('sign-in-btn');
    const signInLinkMobile = document.getElementById('sign-in-link-mobile');
    const profileLinkDesktop = document.getElementById('profile-link') || document.getElementById('dashboard-link');
    const profileLinkMobile = document.getElementById('profile-link-mobile');
    const adminLinkDesktop = document.getElementById('admin-link');
    const adminLinkMobile = document.getElementById('admin-link-mobile');
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
    if (signInBtn) signInBtn.classList.toggle('hidden', isAuth);
    if (signInLinkMobile) signInLinkMobile.classList.toggle('hidden', isAuth);
    if (profileLinkDesktop) profileLinkDesktop.classList.toggle('hidden', !isAuth);
    if (profileLinkMobile) profileLinkMobile.classList.toggle('hidden', !isAuth);
    const isAdmin = document.documentElement.dataset.admin === 'true';
    if (adminLinkDesktop) adminLinkDesktop.classList.toggle('hidden', !isAdmin);
    if (adminLinkMobile) adminLinkMobile.classList.toggle('hidden', !isAdmin);
    if (profileAvatar) {
      if (isAuth && user && user.picture) {
        profileAvatar.src = user.picture;
        profileAvatar.classList.remove('hidden');
      } else {
        profileAvatar.classList.add('hidden');
        profileAvatar.removeAttribute('src');
      }
    }
    if (signOutBtn) {
      signOutBtn.onclick = () => window.auth.logout();
    }
  }

  function debouncedUpdateAuthUI() {
    clearTimeout(updateAuthUITimer);
    updateAuthUITimer = setTimeout(updateAuthUI, 100);
  }

  function showAuthError(message) {
    if (authErrorShown) return;
    authErrorShown = true;
    const text = message || 'Authentication is currently unavailable. Please try again later.';
    if (!document.getElementById('auth-error')) {
      const msg = document.createElement('div');
      msg.id = 'auth-error';
      msg.className = 'bg-red-100 text-red-700 p-2 text-center';
      msg.textContent = text;
      document.body.prepend(msg);
    }
    if (typeof alert === 'function') {
      alert(text);
    }
    debouncedUpdateAuthUI();
  }
  window.showAuthError = showAuthError;

  // Show an auth error if the Auth0 SDK script fails to load
  const auth0Script = document.querySelector('script[src*="auth0-spa-js"]');
  if (auth0Script) {
    auth0Script.addEventListener('error', () => {
      if (authDebug) console.debug('Auth0 SDK script failed to load');
      showAuthError();
    });
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
    try {
      await window.authReady;
    } catch (e) {
      showAuthError();
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    if (!auth0Client) {
      showAuthError();
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    return fn();
  }

  window.initAuth = function initAuth() {
    if (window.authInitialized) return window.authReady;
    window.authInitialized = true;
    if (authDebug) console.debug('initAuth called');
    const domainMeta = document.querySelector('meta[name="auth0-domain"]');
    const domain = domainMeta ? domainMeta.content : (window.AUTH0_DOMAIN || '');
    const clientMeta = document.querySelector('meta[name="auth0-client-id"]');
    const clientId = clientMeta ? clientMeta.content : (window.AUTH0_CLIENT_ID || '');
    const redirect_uri = window.location.origin + '/auth/callback.html';
    if (authDebug) console.debug('Auth0 config', { domain, clientId, redirect_uri, audience: AUDIENCE });
    signInBtn = document.getElementById('sign-in-btn');
    if (!domain || !clientId || !AUDIENCE) {
      showAuthError('Auth0 init failed — missing domain/client/audience');
      authReadyReject(new Error('Missing Auth0 config'));
      finalizeAuthState();
      window.authReady.catch(() => {});
      return window.authReady;
    }
    const sdkLoaded =
      typeof createAuth0Client === 'function' ||
      (window.auth0 && typeof window.auth0.createAuth0Client === 'function');
    if (!sdkLoaded) {
      showAuthError();
      authReadyReject(new Error('Auth0 SDK not loaded'));
      finalizeAuthState();
      window.authReady.catch(() => {});
      return window.authReady;
    }

    (async () => {
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
        if (!createClientFn) throw new Error('Auth0 SPA SDK not loaded');
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
        authReadyReject(new Error('Auth0 client unavailable'));
        finalizeAuthState();
        return;
      }
      if (authDebug) console.debug('Auth0 ready');
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
        getApiToken,
        handleRedirectCallback: () =>
          withClient(async () => {
            const res = await handleRedirectCallbackSafe();
            await refreshAuthState();
            return res;
          })
      };
      authReadyResolve();
      await refreshAuthState();
    })();

    window.authReady.catch(() => {});
    return window.authReady;
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
  }
  window.initAuth();
})();
