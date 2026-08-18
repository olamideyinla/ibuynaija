-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Listing Variants & Stock Tracking (Spec §3.3a)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Design decisions:
--   • Every listing MUST have ≥ 1 variant.  Single-variant ("simple") listings
--     use attributes = '{}' and no price_override so the seller never sees the
--     variant concept unless they opt in.
--   • is_available is a stored GENERATED column so no application code can
--     accidentally misread stock.
--   • The auto-expiry trigger fires AFTER INSERT OR UPDATE OF stock_count.
--     It sets listings.status = 'sold' only when ALL variants reach 0 and the
--     listing is currently 'active'.  It does NOT auto-reactivate on restock
--     (admin/seller must re-activate explicitly).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE listing_variants (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  attributes     JSONB       NOT NULL DEFAULT '{}',    -- e.g. {"size":"M","colour":"Blue"}
  price_override NUMERIC(12, 2),                       -- NULL → use listing.price
  stock_count    INTEGER     NOT NULL DEFAULT 0
                             CHECK (stock_count >= 0),
  -- Derived: false when stock_count = 0; stored so it can be indexed/queried cheaply.
  is_available   BOOLEAN     GENERATED ALWAYS AS (stock_count > 0) STORED
);

CREATE INDEX listing_variants_listing_idx
  ON listing_variants(listing_id);

CREATE INDEX listing_variants_available_idx
  ON listing_variants(listing_id)
  WHERE is_available = TRUE;

-- ─── AUTO-EXPIRY TRIGGER ─────────────────────────────────────────────────────
-- Fires after every INSERT or stock_count UPDATE on a variant.
-- If no variant for the listing has stock > 0, the listing is marked 'sold'.

CREATE OR REPLACE FUNCTION check_listing_stock_on_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   listing_variants
    WHERE  listing_id  = NEW.listing_id
      AND  stock_count > 0
  ) THEN
    UPDATE listings
    SET    status = 'sold'
    WHERE  id     = NEW.listing_id
      AND  status = 'active';   -- no-op if already sold/expired
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER listing_variants_auto_expire
  AFTER INSERT OR UPDATE OF stock_count
  ON listing_variants
  FOR EACH ROW EXECUTE FUNCTION check_listing_stock_on_change();

-- ─── BACKFILL EXISTING LISTINGS ──────────────────────────────────────────────
-- Give every pre-existing listing exactly one implicit variant.
-- Active listings get stock 10; sold/expired listings get stock 0.
-- The trigger fires per-row but is harmless: active+stock>0 → no status change;
-- sold+stock=0 → UPDATE targets 'active' only → 0 rows updated.

INSERT INTO listing_variants (listing_id, attributes, price_override, stock_count)
SELECT
  l.id,
  '{}',
  NULL,
  CASE WHEN l.status = 'active' THEN 10 ELSE 0 END
FROM listings l;
