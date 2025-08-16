export async function fetchWithAuth(input, init = {}) {
  if (!window.auth) {
    await new Promise(resolve => {
      document.addEventListener('auth:ready', resolve, { once: true });
    });
  }
  const token = await window.auth.getApiToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}
