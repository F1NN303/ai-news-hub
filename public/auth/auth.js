// public/auth/auth.js
(() => {
  // --- Helpers to read injected meta tags (fallback to window vars) ---
  const meta = (n) => document.querySelector(`meta[name="${n}"]`)?.content?.trim() || '';
  const DOMAIN   = meta('auth0-domain')     || (window.AUTH0_DOMAIN   || 'dev-zi3ojkfg51ob4f3c.eu.auth0.com');
  const CLIENT   = meta('auth0-client-id')  || (window.AUTH0_CLIENT_ID || 'a2MdQnWFC2HOqBY09V4EZ7KOFjj3fXNK');
  const AUDIENCE = meta('auth0-audience')   || (window.AUTH0_AUDIENCE || 'https://ai-news-hub-eta.vercel.app/api');
  const ORIGIN   = window.location.origin;
  const CALLBACK = `${ORIGIN}/auth/callback.html`;

  // Buttons are optional; if present we wire them up
  const signInBtn  = document.getElementById('sign-in-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signInBtn) signInBtn.disabled = true;

  let auth0Client;
  let authErrorShown = false;

  function showAuthError(msg = 'Authentication is currently unavailable. Please try again later.') {
    if (authErrorShown) return;
    authErrorShown = true;
    [signInBtn, signOutBtn].forEach(btn => {
      if (btn) { btn.disabled = true; btn.classList.add('opacity-50','cursor-not-allowed'); }
    });
    if (!document.getElementById('auth-error')) {
      const el = document.createElement('div');
      el.id = 'auth-error';
      el.className = 'bg-red-100 text-red-700 p-2 text-center';
      el.textContent = msg;
      document.body.prepend(el);
    }
  }

  // Expose a global "ready" promise for pages like /profile.html
  let authResolve;
  window.authReady = new Promise((r) => (authResolve = r));

  async function initAuth() {
    // Ensure the SDK exists (works even if loaded under window.auth0)
    const createClientFn =
      typeof window.createAuth0Client === 'function'
        ? window.createAuth0Client
        : (window.auth0 && typeof window.auth0.createAuth0Client === 'function'
            ? window.auth0.createAuth0Client
            : null);

    if (!createClientFn) {
      console.error('Auth0 SPA SDK not loaded');
      showAuthError();
      authResolve?.({});
      return;
    }

    try {
      auth0Client = await createClientFn({
        domain: DOMAIN,
        clientId: CLIENT,
        authorizationParams: {
          redirect_uri: CALLBACK,
          audience: AUDIENCE
        },
        cacheLocation: 'localstorage',  // critical for iOS Safari
        useRefreshTokens: true
      });
    } catch (e) {
      console.error('Auth0 init failed', e);
      showAuthError();
      authResolve?.({});
      return;
    }

    // Handle redirect callback (if we are on /auth/callback.html)
    try {
      const isCallbackPage = window.location.pathname.endsWith('/auth/callback.html');
      const hasParams = new URLSearchParams(window.location.search).has('code');
      if (isCallbackPage && hasParams) {
        await auth0Client.handleRedirectCallback();
        const returnTo = sessionStorage.getItem('app:returnTo') || '/';
        sessionStorage.removeItem('app:returnTo');
        window.history.replaceState({}, document.title, returnTo);
      }
    } catch (e) {
      console.error('handleRedirectCallback failed', e);
      showAuthError('Authentication failed.');
      authResolve?.({});
      return;
    }

    // Build global auth snapshot (+ token helper)
    const isAuthenticated = await auth0Client.isAuthenticated();
    const user = isAuthenticated ? await auth0Client.getUser() : null;

    async function getApiToken(scope = 'manage:site') {
      try {
        return await auth0Client.getTokenSilently({
          authorizationParams: { audience: AUDIENCE, scope }
        });
      } catch (e) {
        // Don’t spam UI; debug only
        console.debug('getTokenSilently failed', e);
        return null;
      }
    }

    window.__auth = { user, isAuthenticated, getApiToken };
    if (signInBtn) signInBtn.disabled = false;

    // Toggle a dataset flag so your nav can react via CSS/JS
    document.documentElement.dataset.auth = isAuthenticated ? 'true' : 'false';

    authResolve(window.__auth);
  }

  // Public helpers
  window.signIn = async () => {
    if (!auth0Client) return showAuthError();
    sessionStorage.setItem('app:returnTo', window.location.pathname + window.location.search);
    await auth0Client.loginWithRedirect({
      authorizationParams: { redirect_uri: CALLBACK, audience: AUDIENCE }
    });
  };

  window.signOut = async () => {
    if (!auth0Client) return showAuthError();
    await auth0Client.logout({ logoutParams: { returnTo: ORIGIN } });
  };

  // Back-compat wrapper under window.auth (so bestehender Code weiter läuft)
  window.auth = {
    login:  () => window.signIn(),
    logout: () => window.signOut(),
    getUser: async () => (await window.authReady).user || null,
    isAuthenticated: async () => !!(await window.authReady).isAuthenticated,
    getIdTokenClaims: async () => {
      if (!auth0Client) return null;
      try { return await auth0Client.getIdTokenClaims(); } catch { return null; }
    },
    handleRedirectCallback: async () => {
      // left for compatibility; real handling happens in initAuth()
      return;
    },
    ready: window.authReady
  };

  // Wire buttons if they exist
  signInBtn?.addEventListener('click', () => window.signIn());
  signOutBtn?.addEventListener('click', () => window.signOut());

  // Kick off
  initAuth();
})();
