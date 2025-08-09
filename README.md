# AI News Hub

## Database setup

The project uses a Postgres database hosted on [Neon](https://neon.tech/).
To create the `posts`, `users`, and `comments` tables and seed an initial
admin account, open the SQL Editor in Neon and run the commands from
[`docs/db-migration.sql`](docs/db-migration.sql).

If you're provisioning a brand new database, you can also run
[`schema.sql`](schema.sql) which contains the same schema plus the admin seed.

Remember to replace the placeholder password hash before deploying to production.
