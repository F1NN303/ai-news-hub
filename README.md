# AI News Hub

## Database Setup (Neon)

1. Sign in to [Neon](https://neon.tech) and open your project.
2. Launch the **SQL Editor**.
3. Generate a bcrypt hash for the initial admin password:
   ```bash
   node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
   ```
4. Replace `PLACEHOLDER_HASH` in [`docs/db-migration.sql`](docs/db-migration.sql) with the generated hash.
5. Copy the script contents into the SQL Editor and execute them to create the `users` and `comments` tables and seed the admin user.
6. For a fresh database you may alternatively run [`schema.sql`](schema.sql), which contains the full schema and seed data.

### Promote a User

Users signing in via OAuth are added to the `users` table with `role='user'`. To grant
administrator privileges, run this SQL in your database:

```sql
UPDATE users SET role='admin' WHERE email='example@domain.com';
```

Replace `example@domain.com` with the email of the account you want to promote.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and provide values for:
   - `DATABASE_URL` – Postgres connection string (Neon requires SSL).
   - `JWT_SECRET` – Secret used to sign/verify JWTs locally.
   - `SESSION_SECRET` – Secret for signing the `session` cookie.
   - `JWKS_URL` – optional JWKS endpoint to verify tokens from an external provider.
3. Start the development server (requires the [Vercel CLI](https://vercel.com/docs/cli)):
   ```bash
   npx vercel dev
   ```
   The site is available at `http://localhost:3000` and API routes under `http://localhost:3000/api/*`.

## Stack Auth OAuth setup

1. In the Stack Auth console, enable the **Google** and **GitHub** providers.
2. Set the following environment variables:
   - `NEXT_PUBLIC_STACK_PROJECT_ID` – your Stack Auth project ID (configure in Vercel).
   - `JWKS_URL` – `https://api.stack-auth.com/api/v1/projects/<project_id>/.well-known/jwks.json`
3. In Stack Auth, allow these redirect URIs:
   - `https://ai-news-hub-eta.vercel.app/api/auth/callback`
   - `http://localhost:3000/api/auth/callback`

### OAuth routes

- `GET /api/auth/oauth/[provider]` – starts the OAuth flow and redirects to the provider.
- `GET /api/auth/callback` – handles the OAuth callback and issues the same `session` cookie used by email/password login.

## API Usage

Before making POST requests, obtain a CSRF token and store cookies locally:
```bash
curl -c cookies.txt -s http://localhost:3000/api/auth/signup -o /dev/null
CSRF=$(grep csrf cookies.txt | awk '{print $7}')
```

### Sign Up
Send the token and cookie:
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"name":"Alice","email":"alice@example.com","password":"password123"}' \
  -b cookies.txt -c cookies.txt
```

### Log In
Refresh the CSRF token and capture the session cookie:
```bash
CSRF=$(grep csrf cookies.txt | awk '{print $7}')
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"alice@example.com","password":"password123"}' \
  -b cookies.txt -c cookies.txt
```

### Admin-only Request

Even when using OAuth login, `/api/admin/*` endpoints and post mutation routes
(`POST /api/posts`, `PUT /api/posts/[id]`, `DELETE /api/posts/[id]`) require the session
JWT to include `role='admin'`. Include the session cookie (and CSRF token if desired)
to access restricted endpoints:
```bash
CSRF=$(grep csrf cookies.txt | awk '{print $7}')
curl http://localhost:3000/api/admin/users \
  -b cookies.txt \
  -H "X-CSRF-Token: $CSRF"
```

### Delete a Comment

Owners can remove their own comments (admins can remove any comment) by sending a `DELETE` request:

```bash
CSRF=$(grep csrf cookies.txt | awk '{print $7}')
curl -X DELETE http://localhost:3000/api/comments/123 \
  -b cookies.txt \
  -H "X-CSRF-Token: $CSRF"
```

This endpoint may be rate limited to prevent abuse.

## Deployment on Vercel

1. Push the repository to your Git host and [import it into Vercel](https://vercel.com/new).
2. In **Project Settings → Environment Variables**, configure the same variables used locally
   (`DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, and `JWKS_URL` if used).
3. Deploy the project. Vercel builds the static files and exposes the `api/` directory as
   serverless functions.
4. After deployment, ensure [docs/db-migration.sql](docs/db-migration.sql) has been run on
   your Neon database so the required tables and admin user exist.

### Production behavior

With the environment variables configured, logging in in production creates a signed `session`
cookie that protects admin endpoints such as `/api/admin/users`. Calling `/api/auth/logout`
clears the `session` cookie using the same attributes. Ensure `SESSION_SECRET` is configured
in your environment so the cookie cannot be tampered with.

## CSRF protection

Mutation endpoints (`/api/auth/login`, `/api/auth/signup`, `/api/comments`, and `/api/admin/*` routes)
require a valid CSRF token. A random token is issued in a `csrf` cookie that is
signed with `SESSION_SECRET`. Clients must echo the token in the `X-CSRF-Token`
header when making POST/PUT/DELETE requests.

## Rate limiting

The login and signup APIs apply a small in‑memory rate limiter to throttle repeated attempts by
IP address and email. After several failed attempts within a short window these endpoints
respond with HTTP 429 to slow down brute‑force attacks.
