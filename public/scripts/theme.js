(function(){
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  window.toggleTheme = function(){
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    root.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  };
})();
