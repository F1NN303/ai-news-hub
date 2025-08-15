(() => {
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`).join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return {};
    }
  }

  window.parseJwt = parseJwt;

  window.initRoles = async function initRoles() {
    try {
      const token = await getApiToken();
      const { permissions = [] } = parseJwt(token);
      const isAdmin = permissions.includes('admin:all');
      window.isAdmin = isAdmin;
      const adminLink = document.getElementById('admin-link');
      const adminLinkMobile = document.getElementById('admin-link-mobile');
      if (adminLink) adminLink.classList.toggle('hidden', !isAdmin);
      if (adminLinkMobile) adminLinkMobile.classList.toggle('hidden', !isAdmin);
    } catch (e) {
      window.isAdmin = false;
      const adminLink = document.getElementById('admin-link');
      const adminLinkMobile = document.getElementById('admin-link-mobile');
      if (adminLink) adminLink.classList.add('hidden');
      if (adminLinkMobile) adminLinkMobile.classList.add('hidden');
    }
  };
})();
