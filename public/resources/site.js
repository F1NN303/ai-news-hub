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
    signInLinkMobile.addEventListener('click', () => {
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    });
  }

  const desktopBtn = document.getElementById('sign-in-btn');
  if (desktopBtn) {
    desktopBtn.addEventListener('click', () => {
      sessionStorage.setItem('postLoginRedirect', location.pathname + location.search);
    });
  }
})();
