# AI News Hub

## Environment Variables

Create a `.env` file with the following variables.

### Database

- `DATABASE_URL` – Postgres connection string (Neon requires SSL)

### Auth0

Set these variables to enable authentication with Auth0:

- `AUTH0_SECRET` – session secret used to encrypt cookies. Use a long, random value and keep it consistent between local and production.
- `AUTH0_BASE_URL` – base URL of this app. Use `http://localhost:3000` locally and `https://ai-news-hub-eta.vercel.app` in production.
- `AUTH0_CLIENT_ID` – Auth0 application client ID from your Auth0 dashboard. Use the production client ID when deployed.
- `AUTH0_CLIENT_SECRET` – Auth0 application client secret from your Auth0 dashboard. Use the production client secret when deployed.
- `AUTH0_ISSUER_BASE_URL` – Auth0 issuer URL (e.g., `https://your-tenant.auth0.com`).

## Auth0 Dashboard Settings

Configure these values in your Auth0 application settings:

| Setting | Production | Local |
| --- | --- | --- |
| Allowed Callback URLs | `https://ai-news-hub-eta.vercel.app/api/auth/callback` | `http://localhost:3000/api/auth/callback` |
| Allowed Logout URLs | `https://ai-news-hub-eta.vercel.app/` | `http://localhost:3000/` |
| Web Origins | `https://ai-news-hub-eta.vercel.app` | `http://localhost:3000` |
| Application Login URI | `https://ai-news-hub-eta.vercel.app/login` | `http://localhost:3000/login` |

## Database Setup (Neon)

1. Sign in to [Neon](https://neon.tech) and open your project.
2. Launch the **SQL Editor**.
