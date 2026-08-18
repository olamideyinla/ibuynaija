-- Migration 011: make cart_items reference a specific variant
-- Depends on: 010_listing_variants.sql (listing_variants table must exist)
--
-- Changes:
--   1. Add variant_id column (nullable initially for backfill)
--   2. Backfill: resolve each cart row to the implicit variant (attributes = '{}')
--      for its listing_id.  By the time this runs, every listing has exactly one
--      implicit variant created by migration 010.
--   3. Make variant_id NOT NULL
--   4. Drop old UNIQUE (buyer_id, listing_id) constraint
--   5. Add new UNIQUE (buyer_id, variant_id) constraint
--   6. Add FK + covering index

-- Step 1: add nullable column
ALTER TABLE cart_items
  ADD COLUMN variant_id UUID REFERENCES listing_variants(id) ON DELETE CASCADE;

-- Step 2: backfill — each listing has exactly one implicit variant from migration 010
UPDATE cart_items ci
SET variant_id = lv.id
FROM listing_variants lv
WHERE lv.listing_id = ci.listing_id
  AND lv.attributes = '{}';

-- Any cart row that could not be resolved (should not happen after migration 010)
-- is deleted to keep the table clean.
DELETE FROM cart_items WHERE variant_id IS NULL;

-- Step 3: enforce NOT NULL
ALTER TABLE cart_items
  ALTER COLUMN variant_id SET NOT NULL;

-- Step 4: drop the old unique constraint
--   PostgreSQL auto-names the constraint; we need to find and drop it.
--   The name from migration 004 was cart_items_buyer_id_listing_id_key.
ALTER TABLE cart_items
  DROP CONSTRAINT IF EXISTS cart_items_buyer_id_listing_id_key;

-- Step 5: new unique constraint (buyer can have size M and size L of the same listing)
ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_buyer_id_variant_id_key UNIQUE (buyer_id, variant_id);

-- Step 6: covering index (fast lookups by variant)
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items (variant_id);
