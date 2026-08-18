-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001: Users and Sellers
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- One account per phone number (Nigerian +234 only).
-- Roles are non-exclusive: same user can be buyer, seller, and/or provider.
-- location_state / location_city added here (not in v1.2 spec field tables)
-- because 6-band search ranking requires the buyer's location at query time.

CREATE TABLE users (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                    TEXT UNIQUE NOT NULL,     -- E.164 +234XXXXXXXXXX
  email                    TEXT,                     -- optional
  is_buyer                 BOOLEAN NOT NULL DEFAULT FALSE,
  is_seller                BOOLEAN NOT NULL DEFAULT FALSE,
  is_service_provider      BOOLEAN NOT NULL DEFAULT FALSE,
  -- Buyer fields
  saved_delivery_addresses TEXT[],                   -- array of address strings
  -- Location for ranking (set when user first browses / searches)
  location_state           TEXT,
  location_city            TEXT,
  date_joined              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SELLERS / PROVIDERS ─────────────────────────────────────────────────────
-- Created when a user registers as seller or service provider.
-- verified_by FK to admin_users added in migration 007 (after admin table exists).

CREATE TABLE sellers (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                   TEXT UNIQUE NOT NULL,
  business_name          TEXT NOT NULL,
  tagline                TEXT,
  description            TEXT,
  state                  TEXT NOT NULL,
  city_area              TEXT NOT NULL,
  logo_photo_url         TEXT,
  banner_image_url       TEXT,
  -- Bank details: shown only on the Order page, never on the public profile.
  bank_account_name      TEXT,
  bank_account_number    TEXT,
  bank_name              TEXT,
  -- Verification
  verification_requested BOOLEAN NOT NULL DEFAULT FALSE,
  verified_status        BOOLEAN NOT NULL DEFAULT FALSE,
  verified_date          TIMESTAMPTZ,
  verified_by            UUID,            -- FK added in migration 007
  provider_type          TEXT NOT NULL
                         CHECK (provider_type IN ('seller','provider','both')),
  date_created           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sellers_user_id_idx      ON sellers(user_id);
CREATE INDEX sellers_slug_idx         ON sellers(slug);
CREATE INDEX sellers_location_idx     ON sellers(state, city_area);
CREATE INDEX sellers_verified_idx     ON sellers(verified_status);

-- ─── SLUG HISTORY ────────────────────────────────────────────────────────────
-- Written whenever a seller edits their slug.
-- /shop/[slug] checks sellers first; on 404 checks here and issues a 301.

CREATE TABLE slug_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id  UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  old_slug   TEXT NOT NULL,
  new_slug   TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX slug_history_old_slug_idx ON slug_history(old_slug);
