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

## Local Development

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

## API Usage

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"password123"}'
```

### Log In
Store the session cookie for subsequent requests:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' \
  -c cookies.txt
```

### Admin-only Request
Use the saved cookie to access an endpoint restricted to admins:
```bash
curl http://localhost:3000/api/admin/users -b cookies.txt
```

## Deployment on Vercel

1. Push the repository to your Git host and [import it into Vercel](https://vercel.com/new).
2. In **Project Settings → Environment Variables**, configure the same variables used locally
   (`DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, and `JWKS_URL` if used).
3. Deploy the project. Vercel builds the static files and exposes the `api/` directory as
   serverless functions.
4. After deployment, ensure [docs/db-migration.sql](docs/db-migration.sql) has been run on
   your Neon database so the required tables and admin user exist.

With the environment variables configured, login in production creates a signed `session`
cookie that guards admin endpoints like `/api/admin/users`.
