-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003: Listings (Products)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE listings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id        UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  category_id      UUID NOT NULL REFERENCES categories(id),
  price            NUMERIC(12, 2),     -- NULL = "Price on request" (enquire-only)
  photos           TEXT[] NOT NULL DEFAULT '{}',  -- Cloudinary URLs; max 5 enforced in API
  made_in_nigeria  BOOLEAN NOT NULL DEFAULT FALSE,
  condition        TEXT NOT NULL CHECK (condition IN ('new', 'used')),
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'sold', 'expired')),
  -- Full-text search vector (maintained by trigger below)
  search_vector    TSVECTOR,
  date_posted      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- HARD RULE: a listing may only be 'active' if made_in_nigeria is TRUE.
  -- The API enforces this first; this CHECK is belt-and-suspenders.
  CONSTRAINT made_in_nigeria_required
    CHECK (made_in_nigeria = TRUE OR status <> 'active')
);

-- ─── FULL-TEXT SEARCH ────────────────────────────────────────────────────────
-- Indexes title + description. Seller business_name is joined at query time
-- using a separate GIN index on sellers (see indexes below).
-- Using 'english' config; acceptable for Nigerian-English product text.

CREATE OR REPLACE FUNCTION listings_search_vector_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- ─── LISTING REPORTS ─────────────────────────────────────────────────────────
-- Buyers report listings; Admin reviews via /admin/listings.

CREATE TABLE listing_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reporter_id  UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = anonymous
  reason       TEXT NOT NULL
               CHECK (reason IN ('not_made_in_nigeria', 'counterfeit', 'inappropriate')),
  details      TEXT,       -- Optional free text from reporter
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  date_created TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

CREATE INDEX listings_search_idx          ON listings USING GIN(search_vector);
CREATE INDEX listings_category_status_idx ON listings(category_id, status);
CREATE INDEX listings_seller_id_idx       ON listings(seller_id);
CREATE INDEX listings_status_idx          ON listings(status);
CREATE INDEX listings_date_posted_idx     ON listings(date_posted DESC);

-- Seller business_name GIN for cross-table search join
CREATE INDEX sellers_business_name_idx
  ON sellers USING GIN(to_tsvector('english', business_name));

CREATE INDEX listing_reports_listing_idx  ON listing_reports(listing_id, resolved);
