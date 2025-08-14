# Auth0 Configuration

This project relies on Auth0 for authentication. Configure your Auth0 application with the following settings:

- **Allowed Callback URLs**: `https://ai-news-hub-eta.vercel.app/auth/callback.html`
- **Allowed Logout URLs**: `https://ai-news-hub-eta.vercel.app/`
- **Allowed Web Origins**: `https://ai-news-hub-eta.vercel.app`

## Debugging

Append `?auth_debug=1` to any site URL to enable authentication debug output. This exposes additional logging in the browser console to help trace Auth0 issues.

## Safari Testing Notes

Safari's Intelligent Tracking Prevention can block third-party cookies required for Auth0. If authentication does not work in Safari:

1. Open **Safari Preferences** → **Privacy**.
2. Ensure **Prevent cross-site tracking** is unchecked.
3. Retry the login flow, optionally with `?auth_debug=1` enabled to gather logs.

