-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004: Cart, Checkout Sessions, and Orders
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── CART ────────────────────────────────────────────────────────────────────
-- Persistent in DB (linked to buyer's user id).
-- Items with listing.status != 'active' are shown greyed-out on the cart page;
-- checkout is blocked until the buyer manually removes them.
-- Price-null listings cannot be added to cart (API enforces this).

CREATE TABLE cart_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (buyer_id, listing_id)
);

CREATE INDEX cart_items_buyer_idx ON cart_items(buyer_id);

-- ─── CHECKOUT SESSIONS ───────────────────────────────────────────────────────
-- Created once per checkout action.
-- Multiple Orders (one per seller) all share the same checkout_session_id,
-- so delivery address and buyer contact are stored once, not duplicated.

CREATE TABLE checkout_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES users(id),
  delivery_method  TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  delivery_address TEXT,   -- Required when delivery_method = 'delivery'
  buyer_phone      TEXT NOT NULL,
  buyer_email      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX checkout_sessions_buyer_idx ON checkout_sessions(buyer_id);

-- ─── ORDERS ──────────────────────────────────────────────────────────────────
-- One order per seller per checkout session.
-- line_items JSON shape: [{listing_id, title, qty, unit_price}]
-- Bank details are NEVER stored here — they are fetched from sellers at
-- render time and never returned to non-participants.
-- seller_cancelled is removed (redundant with status = 'cancelled').

CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_session_id  UUID NOT NULL REFERENCES checkout_sessions(id),
  buyer_id             UUID NOT NULL REFERENCES users(id),
  seller_id            UUID NOT NULL REFERENCES sellers(id),
  line_items           JSONB NOT NULL,
  total                NUMERIC(12, 2) NOT NULL CHECK (total > 0),
  status               TEXT NOT NULL DEFAULT 'awaiting_payment'
                       CHECK (status IN (
                         'awaiting_payment',
                         'payment_claimed',
                         'confirmed_by_seller',
                         'fulfilled',
                         'cancelled'
                       )),
  receipt_attachment_url TEXT,    -- Cloudinary URL, optional (buyer attaches proof)
  date_created         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_buyer_idx   ON orders(buyer_id);
CREATE INDEX orders_seller_idx  ON orders(seller_id);
CREATE INDEX orders_status_idx  ON orders(status);
CREATE INDEX orders_session_idx ON orders(checkout_session_id);

-- ─── AUTO-UPDATE date_updated ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_date_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.date_updated = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_date_updated
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_date_updated();
