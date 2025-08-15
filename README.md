# AI News Hub

## Environment Variables

Create a `.env` file with the following variables.

### Database

- `DATABASE_URL` – Postgres connection string (Neon requires SSL)

### Auth0

- `AUTH0_AUDIENCE` – `https://ai-news-hub.api`

## Auth0 Dashboard Settings

In your Auth0 Single Page Application settings, configure:

- **Allowed Callback URLs**: `https://ai-news-hub-eta.vercel.app/auth/callback.html`
- **Allowed Logout URLs**: `https://ai-news-hub-eta.vercel.app/`
- **Allowed Web Origins**: `https://ai-news-hub-eta.vercel.app`
- **(Optional) Application Login URI**: `https://ai-news-hub-eta.vercel.app/`

Enable Google and Username-Password-Authentication connections.

We secure `/api` routes with Auth0 JWTs (audience: `https://ai-news-hub.api`). Mutating routes require `posts:write` or `admin:all`.

## Database Setup (Neon)

1. Sign in to [Neon](https://neon.tech) and open your project.
2. Launch the **SQL Editor**.
