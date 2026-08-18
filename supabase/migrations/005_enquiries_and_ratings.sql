-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: Enquiries and Ratings
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENQUIRIES ───────────────────────────────────────────────────────────────
-- An enquiry is a button click — no in-app chat.
-- Effect: logs interest, triggers SMS to seller with buyer's phone number.
-- Also gates the buyer's ability to rate this listing.
-- UNIQUE constraint prevents a buyer enquiring on the same listing twice.

CREATE TABLE enquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, listing_id)
);

CREATE INDEX enquiries_listing_idx ON enquiries(listing_id);
CREATE INDEX enquiries_buyer_idx   ON enquiries(buyer_id);

-- ─── RATINGS ─────────────────────────────────────────────────────────────────
-- A buyer may only rate a listing if they have a prior enquiry OR order on it.
-- This is enforced in the API (POST /api/ratings checks enquiries + orders).
-- Two scores: buying_experience + product_quality, both 1–5.
-- One rating per buyer per listing.

CREATE TABLE ratings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id              UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buying_experience_score SMALLINT NOT NULL
                          CHECK (buying_experience_score BETWEEN 1 AND 5),
  product_quality_score   SMALLINT NOT NULL
                          CHECK (product_quality_score BETWEEN 1 AND 5),
  comment                 TEXT,
  reported                BOOLEAN NOT NULL DEFAULT FALSE,
  date_created            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, listing_id)
);

CREATE INDEX ratings_listing_idx  ON ratings(listing_id);
CREATE INDEX ratings_reported_idx ON ratings(reported) WHERE reported = TRUE;

-- ─── RATING REPORTS ──────────────────────────────────────────────────────────
-- Buyers or anyone can report a rating; Admin reviews via /admin/ratings.

CREATE TABLE rating_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id    UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  reporter_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  reason       TEXT NOT NULL
               CHECK (reason IN ('fake', 'inappropriate', 'spam')),
  details      TEXT,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX rating_reports_rating_idx ON rating_reports(rating_id, resolved);
