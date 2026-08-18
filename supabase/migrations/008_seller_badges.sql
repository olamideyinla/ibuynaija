-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 008: Seller activity badges
--
-- Two boolean flags written exclusively by the /api/cron/badges recalculation
-- job.  Sellers cannot set, unset, or hide these fields.
--
-- Thresholds and weights live in lib/badge-config.ts — edit there to tune.
-- This table stores only the computed results.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS badge_trending      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS badge_top_seller    BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Timestamp of the last cron run; useful for debugging / monitoring.
  ADD COLUMN IF NOT EXISTS badges_last_updated TIMESTAMPTZ;

-- Partial indexes so badge lookups are cheap even as the sellers table grows.
CREATE INDEX IF NOT EXISTS sellers_badge_trending_idx
  ON sellers (id) WHERE badge_trending = TRUE;

CREATE INDEX IF NOT EXISTS sellers_badge_top_seller_idx
  ON sellers (id) WHERE badge_top_seller = TRUE;
