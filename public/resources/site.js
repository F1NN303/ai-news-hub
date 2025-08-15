// Apply saved theme immediately and sync across tabs
(function() {
  const applyTheme = () => {
    const theme = localStorage.theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  };
  applyTheme();
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') applyTheme();
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        localStorage.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
      });
    }

    // Mobile navigation toggle
    const menuBtn = document.getElementById('menu-button');
    const mobileNav = document.querySelector('.mobile-nav');
    const backdrop = document.getElementById('menu-backdrop');
    if (menuBtn && mobileNav && backdrop) {
      const openNav = () => {
        mobileNav.classList.add('open');
        backdrop.classList.add('open');
        menuBtn.setAttribute('aria-expanded', 'true');
      };
      const closeNav = () => {
        mobileNav.classList.remove('open');
        backdrop.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      };
      menuBtn.addEventListener('click', () => {
        const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
        expanded ? closeNav() : openNav();
      });
      backdrop.addEventListener('click', closeNav);
    }

    // Handle sign-in link click
    const signInLinkMobile = document.getElementById('sign-in-link-mobile');
    if (signInLinkMobile) {
      signInLinkMobile.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
        if (window.auth) window.auth.login();
      });
    }

    // Handle auth link visibility
    document.addEventListener('auth:ready', () => {
      const profileLinkDesktop = document.getElementById('profile-link') || document.getElementById('dashboard-link');
      const profileLinkMobile = document.getElementById('profile-link-mobile');
      const adminLink = document.getElementById('admin-link-mobile');
      const signInLink = document.getElementById('sign-in-link-mobile');
      const isAdmin = document.documentElement.dataset.admin === 'true';
      const isAuth = document.documentElement.dataset.auth === 'true';
      if (profileLinkDesktop) {
        profileLinkDesktop.classList.toggle('hidden', !isAuth);
      }
      if (profileLinkMobile) {
        profileLinkMobile.classList.toggle('hidden', !isAuth);
      }
      if (adminLink) {
        adminLink.classList.toggle('hidden', !isAdmin);
      }
      if (signInLink) {
        signInLink.classList.toggle('hidden', isAuth);
      }
    });
  });
})();
