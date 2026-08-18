-- 017 Seller Applications
-- Buyers submit applications to become sellers.
-- Admin must approve before the sellers record is created and access is granted.

CREATE TABLE IF NOT EXISTS seller_applications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name       TEXT        NOT NULL,
  slug                TEXT        NOT NULL,
  state               TEXT        NOT NULL,
  city_area           TEXT        NOT NULL,
  provider_type       TEXT        NOT NULL DEFAULT 'seller'
                      CHECK (provider_type IN ('seller', 'provider', 'both')),
  bank_account_name   TEXT,
  bank_account_number TEXT,
  bank_name           TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason    TEXT,
  date_applied        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_decided        TIMESTAMPTZ,
  decided_by          UUID        REFERENCES admin_users(id)
);

-- One application row per user (upserted on re-application after rejection)
CREATE UNIQUE INDEX IF NOT EXISTS seller_applications_user_id_idx
  ON seller_applications (user_id);

CREATE INDEX IF NOT EXISTS seller_applications_status_idx
  ON seller_applications (status);
