-- In deiner Postgres-DB ausführen
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  category TEXT,
  tags TEXT[],
  author TEXT,
  hero_image TEXT,
  content TEXT,
  published_at TIMESTAMPTZ DEFAULT now()
);
