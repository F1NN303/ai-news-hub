-- Migration for NextAuth integration
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS image TEXT,
  ALTER COLUMN email_verified TYPE TIMESTAMPTZ USING CASE WHEN email_verified THEN now() ELSE NULL END,
  ALTER COLUMN email_verified DROP DEFAULT;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);
