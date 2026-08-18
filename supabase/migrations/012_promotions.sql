-- Migration 012: Promotions (Spec §3.4a)
--
-- Lets sellers run basic discounts against one listing or all their listings.
-- A promotion is active when NOW() BETWEEN start_date AND end_date.

CREATE TABLE promotions (
  id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id      UUID           NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  scope          TEXT           NOT NULL
                                CHECK (scope IN ('single_listing', 'all_listings')),
  listing_id     UUID           REFERENCES listings(id) ON DELETE CASCADE,
  discount_type  TEXT           NOT NULL
                                CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  start_date     TIMESTAMPTZ    NOT NULL,
  end_date       TIMESTAMPTZ    NOT NULL,
  date_created   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  -- listing_id must be present iff scope = 'single_listing'
  CONSTRAINT promotions_listing_scope_check CHECK (
    (scope = 'single_listing' AND listing_id IS NOT NULL)
    OR
    (scope = 'all_listings'   AND listing_id IS NULL)
  ),
  -- end must be after start
  CONSTRAINT promotions_date_order_check CHECK (end_date > start_date)
);

-- Index for listing-specific promotions (used in LATERAL join per listing)
CREATE INDEX idx_promotions_listing_id
  ON promotions (listing_id)
  WHERE scope = 'single_listing';

-- Index for seller-wide promotions (used in LATERAL join via seller_id)
CREATE INDEX idx_promotions_seller_id
  ON promotions (seller_id)
  WHERE scope = 'all_listings';

-- Index for date-range filtering (the WHERE in the LATERAL)
CREATE INDEX idx_promotions_dates ON promotions (start_date, end_date);
