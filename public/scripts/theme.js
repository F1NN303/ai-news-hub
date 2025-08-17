window.initThemeToggle = function(){
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const apply = (mode) => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.classList.toggle('dark', mode === 'dark');
    localStorage.theme = mode;
  };
  const current = localStorage.theme || 'light';
  apply(current);
  btn.onclick = () => apply((localStorage.theme === 'dark') ? 'light' : 'dark');
};
