# AI News Hub

## Environment Variables

Create a `.env` file with the following variables.

### Database

- `DATABASE_URL` – Postgres connection string (Neon requires SSL)

### Auth0

Set these variables to enable authentication with Auth0:

- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`

## Auth0 Setup

Configure these values in your Auth0 dashboard for the production deployment:

- **Allowed Callback URLs:** `https://ai-news-hub-eta.vercel.app/api/auth/callback`
- **Allowed Logout URLs:** `https://ai-news-hub-eta.vercel.app/`
- **Allowed Web Origins:** `https://ai-news-hub-eta.vercel.app`
- **Application Login URI:** `https://ai-news-hub-eta.vercel.app/api/auth/login`

In Vercel project settings, add the following environment variables:

- `AUTH0_ISSUER_BASE_URL`
- `AUTH0_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`

## Database Setup (Neon)

1. Sign in to [Neon](https://neon.tech) and open your project.
2. Launch the **SQL Editor**.
