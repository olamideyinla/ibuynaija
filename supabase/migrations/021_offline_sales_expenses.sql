-- Migration 019: Offline Sales and Expenses (self-reported business activity)

CREATE TABLE offline_sales (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    UUID          NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date         DATE          NOT NULL,
  note         TEXT,
  listing_id   UUID          REFERENCES listings(id) ON DELETE SET NULL,
  variant_id   UUID          REFERENCES listing_variants(id) ON DELETE SET NULL,
  -- quantity sold; used for stock decrement when variant_id is set
  quantity     INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  date_created TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX offline_sales_seller_date_idx ON offline_sales(seller_id, date DESC);

CREATE TABLE expenses (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id    UUID          NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date         DATE          NOT NULL,
  -- free-text category: seller types their own (no fixed list)
  category     TEXT          NOT NULL,
  note         TEXT,
  date_created TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX expenses_seller_date_idx ON expenses(seller_id, date DESC);
