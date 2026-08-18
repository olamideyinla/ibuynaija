-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 016: Email + password authentication
--
-- Changes:
--   users.phone     → now nullable (email-only accounts have no phone)
--   users.full_name → new TEXT column (display name)
--   users.password_hash → new TEXT column (bcrypt hash)
--   users.email     → unique partial index (enforces uniqueness, allows NULL)
-- ─────────────────────────────────────────────────────────────────────────────

-- phone is optional for email-auth accounts
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- display name
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- bcrypt password hash
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- email must be unique when present (partial index allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON users(email) WHERE email IS NOT NULL;
