// Minimal client for Privacy Center — works with/without backend routes.
(async () => {
  const $ = (id) => document.getElementById(id);
  const showErr = (msg) => { const b = $('authError'); if (b) { b.textContent = msg || b.textContent; b.classList.remove('hidden'); } };

  // Wait for your helper
  if (!window.auth || !window.auth.ready) { showErr('Auth helper not available'); return; }
  try { await window.auth.ready; } catch { showErr('Authentication failed'); return; }

  const isAuthed = await window.auth.isAuthenticated();
  if (!isAuthed) { showErr('Signed out'); return; }
  const user = await window.auth.getUser();
  if (!user) { showErr('No user profile available'); return; }

  // Fill summary
  $('pc-avatar').src = user.picture || '';
  $('pc-name').textContent = user.name || user.nickname || user.email || '—';
  $('pc-email').textContent = user.email || '—';
  $('pc-sub').textContent = user.sub || '—';
  $('pc-updated').textContent = user.updated_at ? new Date(user.updated_at).toLocaleString() : '—';
  if (user.email_verified) $('pc-verified').classList.remove('hidden');

  // Admin chip via custom claim or roles array
  const claim = user['https://ai-news-hub/roles'] || user.roles || [];
  const roles = Array.isArray(claim) ? claim : (typeof claim === 'string' ? claim.split(' ') : []);
  if (roles.includes('admin')) $('pc-admin').classList.remove('hidden');

  // Change password link
  const domain = document.querySelector('meta[name="auth0-domain"]').content.trim();
  const clientId = document.querySelector('meta[name="auth0-client-id"]').content.trim();
  const returnTo = location.origin + '/';
  $('pwd-link').href = `https://${domain}/u/reset-password/request/index?client_id=${encodeURIComponent(clientId)}&returnTo=${encodeURIComponent(returnTo)}`;

  // Sign out
  $('btn-signout').onclick = () => window.auth.logout();

  // ---- Export data (tries API, falls back to local JSON) ----
  $('btn-export').onclick = async () => {
    $('dl-link').classList.add('hidden');
    try {
      const res = await fetch('/api/privacy/export', { headers: { 'Accept':'application/json' } });
      let payload;
      if (res.ok) {
        payload = await res.json();
      } else {
        // fallback: local export of the Auth0 profile we have
        payload = { source:'local-fallback', user };
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = $('dl-link');
      a.href = url; a.download = 'ai-news-hub-export.json';
      a.textContent = 'Download export';
      a.classList.remove('hidden');
    } catch {
      // final fallback
      const blob = new Blob([JSON.stringify({ source:'local-fallback', user }, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = $('dl-link');
      a.href = url; a.download = 'ai-news-hub-export.json';
      a.textContent = 'Download export';
      a.classList.remove('hidden');
    }
  };

  // ---- Deletion (tries API, otherwise guides to email) ----
  $('btn-delete').onclick = async () => {
    try {
      const res = await fetch('/api/privacy/delete', { method:'POST' });
      if (res.ok) {
        alert('Deletion request received. We will process it shortly.');
      } else {
        alert('Server deletion route not available. Please use the email request link.');
      }
    } catch {
      alert('Server not reachable. Please use the email request link.');
    }
  };

  // ---- Consent (API first, local fallback) ----
  const newsletter = $('consent-newsletter');
  const product = $('consent-product');
  const status = $('consent-status');

  // Load current
  try {
    const r = await fetch('/api/privacy/consents', { headers:{'Accept':'application/json'} });
    if (r.ok) {
      const { newsletter: nl=false, product_updates: pu=false } = await r.json();
      newsletter.checked = !!nl;
      product.checked = !!pu;
    } else {
      // local fallback
      newsletter.checked = localStorage.getItem('consent:newsletter') === '1';
      product.checked = localStorage.getItem('consent:product') === '1';
    }
  } catch {
    newsletter.checked = localStorage.getItem('consent:newsletter') === '1';
    product.checked = localStorage.getItem('consent:product') === '1';
  }

  $('btn-save-consent').onclick = async () => {
    status.textContent = 'Saving...';
    const body = { newsletter: !!newsletter.checked, product_updates: !!product.checked };
    try {
      const r = await fetch('/api/privacy/consent-accept', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      if (r.ok) {
        status.textContent = 'Saved';
      } else {
        // local fallback
        localStorage.setItem('consent:newsletter', body.newsletter ? '1':'0');
        localStorage.setItem('consent:product', body.product_updates ? '1':'0');
        status.textContent = 'Saved (local)';
      }
    } catch {
      localStorage.setItem('consent:newsletter', body.newsletter ? '1':'0');
      localStorage.setItem('consent:product', body.product_updates ? '1':'0');
      status.textContent = 'Saved (local)';
    }
    setTimeout(()=>status.textContent='', 2000);
  };

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
