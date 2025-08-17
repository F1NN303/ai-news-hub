window.mountHeader = async function(selector = '#site-header') {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch('/partials/header.html');
    if (!res.ok) throw new Error('Failed to load header');
    const html = await res.text();
    el.innerHTML = html;
  } catch (err) {
    console.error('Header mount error', err);
  }
};

window.initHeaderAuth = async function(){
  if (!window.auth || !window.auth.ready) return;
  await window.auth.ready;
  const isAuthed = await window.auth.isAuthenticated();
  const user = isAuthed ? await window.auth.getUser() : null;
  if (user) {
    document.getElementById('signInBtn').style.display = 'none';
    document.getElementById('signUpBtn').style.display = 'none';
    const avatar = document.getElementById('navAvatar');
    avatar.src = user.picture || '';
    avatar.alt = user.name || user.email || 'Avatar';
    document.getElementById('profileMenu').classList.remove('hidden');
  }
};
