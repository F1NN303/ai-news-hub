# AI News Hub

## Database setup

The project uses a Postgres database hosted on [Neon](https://neon.tech/).
To create the `posts`, `users`, and `comments` tables and seed an initial
admin account, open the SQL Editor in Neon and run the commands from
[`docs/db-migration.sql`](docs/db-migration.sql).

If you're provisioning a brand new database, you can also run
[`schema.sql`](schema.sql) which contains the same schema plus the admin seed.

Remember to replace the placeholder password hash before deploying to production.

## Environment variables

Copy `.env.example` to `.env` and fill in the values for your setup:

- `DATABASE_URL` – Postgres connection string used by the API.
- `JWKS_URL` – URL of a JSON Web Key Set used to validate JWTs from your auth provider.
- `JWT_SECRET` – Alternative to `JWKS_URL`; symmetric secret for verifying JWTs locally.
- `SESSION_SECRET` – Secret used to sign the `session` cookie so that it cannot be tampered with.

## Authentication cookies

Login responses set a signed `session` cookie to persist authentication. The value is
signed with `SESSION_SECRET` and the cookie is sent with the attributes:

```
HttpOnly; Secure; SameSite=Strict; Path=/
```

Calling `/api/auth/logout` clears the `session` cookie using the same attributes.
Ensure `SESSION_SECRET` is configured in your environment so the cookie cannot be
tampered with.
