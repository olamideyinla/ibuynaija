-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 020: Seller business name change requests
--
-- Sellers can request to correct their business_name, but the change does not
-- take effect until an admin approves it. Only one pending request at a time
-- per seller — resubmitting overwrites the previous pending value.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS pending_business_name       TEXT,
  ADD COLUMN IF NOT EXISTS name_change_requested_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name_change_rejected_reason TEXT;

CREATE INDEX IF NOT EXISTS sellers_pending_name_change_idx
  ON sellers (name_change_requested_at)
  WHERE pending_business_name IS NOT NULL;
