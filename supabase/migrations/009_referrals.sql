-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009: Referral scheme
--
-- Two source paths, one reward:
--   Source A  Seller's share link → new buyer signs up → buys from that seller
--             → seller earns a 30-day ranking boost (extendable).
--   Source B  Buyer's generic link → new seller signs up and publishes first listing
--             → buyer earns +1 referral_credit_count (reward TBD).
--
-- Boost logic lives in lib/referral-utils.ts (computeNewBoostEnd, applyBoostToBand).
-- Ranking SQL lives in lib/ranking.ts (rankBandSql).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Referral ledger ─────────────────────────────────────────────────────────
-- referrer_type / referred_type: 'buyer' means a users.id; 'seller' means a sellers.id.
-- No FK constraints because the IDs are polymorphic (users vs sellers table).
-- Application layer enforces validity.

CREATE TABLE referrals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID        NOT NULL,
  referrer_type   TEXT        NOT NULL CHECK (referrer_type   IN ('buyer', 'seller')),
  referred_id     UUID        NOT NULL,
  referred_type   TEXT        NOT NULL CHECK (referred_type   IN ('buyer', 'seller')),
  source          TEXT        NOT NULL CHECK (source          IN ('A', 'B')),
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'successful')),
  date_created    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_successful TIMESTAMPTZ
);

-- Fast lookups when trying to complete a referral
CREATE INDEX referrals_referrer_idx ON referrals (referrer_id, status);
CREATE INDEX referrals_referred_idx ON referrals (referred_id, status);

-- Prevent duplicate pending referrals for the same relationship + source.
-- Multiple completed referrals are allowed (historical record).
CREATE UNIQUE INDEX referrals_unique_pending_idx
  ON referrals (referrer_id, referrer_type, referred_id, referred_type, source)
  WHERE status = 'pending';

-- ─── Users ───────────────────────────────────────────────────────────────────
-- referred_by_seller_id: which seller's share link brought this buyer in (Source A).
-- referral_source:       'A' (referred by a seller link) or 'B' (future use).
-- referral_credit_count: incremented each time a Source-B referral this buyer
--                        made is successfully completed (reward details deferred).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by_seller_id UUID        REFERENCES sellers(id),
  ADD COLUMN IF NOT EXISTS referral_source        TEXT        CHECK (referral_source IN ('A', 'B')),
  ADD COLUMN IF NOT EXISTS referral_credit_count  INTEGER     NOT NULL DEFAULT 0;

-- ─── Sellers ─────────────────────────────────────────────────────────────────
-- referred_by_user_id:         which buyer's link brought this seller in (Source B).
-- referral_source:             'B' for Source B; reserved for future use.
-- referral_boost_active_until: non-null while a Source-A boost is active.
--   Boost is default-on for all sellers — no per-seller opt-in/opt-out.
--   Extended, not stacked, when a second referral arrives while boost is active.

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS referred_by_user_id         UUID        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS referral_source             TEXT        CHECK (referral_source IN ('A', 'B')),
  ADD COLUMN IF NOT EXISTS referral_boost_active_until TIMESTAMPTZ;

-- Only indexes sellers that currently have an active (or future) boost
CREATE INDEX IF NOT EXISTS sellers_boost_idx
  ON sellers (referral_boost_active_until)
  WHERE referral_boost_active_until IS NOT NULL;
