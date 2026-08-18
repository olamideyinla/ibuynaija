-- Migration 018: Stock Events
-- Adds low_stock_threshold to listing_variants and creates the stock_events table.

ALTER TABLE listing_variants
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER;
-- NULL = no alert configured; 0 = disable alert; positive = alert when crossing below

CREATE TYPE stock_change_type AS ENUM (
  'platform_sale',
  'manual_adjustment',
  'restock',
  'offline_sale'
);

CREATE TABLE stock_events (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id      UUID              NOT NULL REFERENCES listing_variants(id) ON DELETE CASCADE,
  change_type     stock_change_type NOT NULL,
  quantity_delta  INTEGER           NOT NULL,
  -- Required for manual_adjustment; optional context for other types
  reason          TEXT,
  date_created    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX stock_events_variant_date_idx
  ON stock_events(variant_id, date_created DESC);
