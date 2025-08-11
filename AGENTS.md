# AGENTS

## Frontend
- Dateien: `index.html`
- Stack: Tailwind + Font Awesome 6
- Backend-API: `GET /api/posts` (JSON)

## Backend
- Dateien: `api/**`
- DB: Postgres (Neon), Tabelle `public.posts`
- Spalten (wichtig): id, slug (unique), title, excerpt, content, category, tags text[], author, image_url, published_at timestamptz default now()
- ENV: `DATABASE_URL` (SSL), `STACK_AUTH_CLIENT_ID`, `STACK_AUTH_CLIENT_SECRET`

## Regeln
- Keine breaking Schema-Änderungen ohne Migration
- PRs erforderlich für `main`
