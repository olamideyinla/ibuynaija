-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 007: Admin Users and Verification Notes
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ADMIN USERS ─────────────────────────────────────────────────────────────
-- Completely separate from the public users table.
-- Auth: email + password (bcrypt). Session = HTTP-only signed cookie.
-- Never exposed via any public-facing API route.

CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt hash
  role          TEXT NOT NULL DEFAULT 'moderator'
                CHECK (role IN ('moderator', 'verifier', 'super_admin')),
  date_created  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── VERIFICATION NOTES ──────────────────────────────────────────────────────
-- Internal-only audit trail for seller verification decisions.
-- NEVER returned in any seller- or buyer-facing API response.

CREATE TABLE verification_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  admin_id     UUID NOT NULL REFERENCES admin_users(id),
  text         TEXT NOT NULL,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX verification_notes_seller_idx ON verification_notes(seller_id);

-- ─── DEFERRED FK: sellers.verified_by → admin_users.id ───────────────────────
-- Could not be added in migration 001 (admin_users did not exist yet).

ALTER TABLE sellers
  ADD CONSTRAINT sellers_verified_by_fk
  FOREIGN KEY (verified_by) REFERENCES admin_users(id) ON DELETE SET NULL;

-- ─── OTP TOKENS ──────────────────────────────────────────────────────────────
-- Short-lived OTP storage for phone authentication.
-- Termii sends the SMS; we store the code here for verification.
-- expires_at enforced in application layer; a cron job or Supabase function
-- can clean up expired rows, but stale rows are harmless.

CREATE TABLE otp_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,      -- 6-digit OTP (hashed with SHA-256)
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX otp_tokens_phone_idx ON otp_tokens(phone, expires_at);
