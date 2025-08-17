# AI News Hub

## Environment Variables

Create a `.env` file with the following variables.

### Database

- `DATABASE_URL` – Postgres connection string (Neon requires SSL)

### Auth0

- `AUTH0_DOMAIN` – Auth0 tenant domain (e.g. `your-tenant.auth0.com`)
- `AUTH0_CLIENT_ID` – Auth0 SPA Client ID
- `AUTH0_CLIENT_SECRET` – Auth0 Client Secret
- `AUTH0_BASE_URL` – Base URL of the app
- `AUTH0_ISSUER_BASE_URL` – Issuer URL (`https://your-tenant.auth0.com`)
- `AUTH0_SECRET` – Session secret
- `AUTH0_AUDIENCE` – `https://ai-news-hub-eta.vercel.app/api`

Ensure these variables are present in the Vercel project settings so builds can inject the required Auth0 meta tags.

## Auth0 Dashboard Settings

In your Auth0 Single Page Application settings, configure:

- **Allowed Callback URLs**: `https://ai-news-hub-eta.vercel.app/auth/callback.html`
- **Allowed Logout URLs**: `https://ai-news-hub-eta.vercel.app/`
- **Allowed Web Origins**: `https://ai-news-hub-eta.vercel.app`
- **(Optional) Application Login URI**: `https://ai-news-hub-eta.vercel.app/`

Enable Google and Username-Password-Authentication connections.

We secure `/api` routes with Auth0 JWTs (audience: `https://ai-news-hub-eta.vercel.app/api`). Mutating routes require `posts:write` or `admin:all`.

## Database Setup (Neon)

1. Sign in to [Neon](https://neon.tech) and open your project.
2. Launch the **SQL Editor**.

## Deploy Checklist

Before deploying, ensure the following environment variables are configured:

- `DATABASE_URL`
- `AUTH0_SECRET`
- `AUTH0_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_DOMAIN`
- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_AUDIENCE`

After setting these variables, run `npm run inject:auth0` to inject the Auth0 meta tags into all public HTML pages.
