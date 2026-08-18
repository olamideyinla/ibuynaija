-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Services and Bookings
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── SERVICE OFFERINGS ───────────────────────────────────────────────────────
-- Each offering belongs to a provider (sellers.provider_type IN ('provider','both')).
-- price_type = 'fixed': price column is set.
-- price_type = 'quote': price is NULL, price_from is an indicative minimum.
-- Each offering has its own availability_schedules (not shared with other offerings).
-- search_vector added here (not in v1.2 spec) since services appear in search.

CREATE TABLE service_offerings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category_id      UUID NOT NULL REFERENCES categories(id),
  description      TEXT NOT NULL,
  price_type       TEXT NOT NULL CHECK (price_type IN ('fixed', 'quote')),
  price            NUMERIC(12, 2),   -- NULL for quote-type
  price_from       NUMERIC(12, 2),   -- Indicative "from" price for quote jobs
  duration_minutes INTEGER,
  location_type    TEXT NOT NULL
                   CHECK (location_type IN ('at_provider', 'provider_travels')),
  photos           TEXT[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive')),
  search_vector    TSVECTOR,
  date_created     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION service_offerings_search_vector_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER service_offerings_search_trigger
  BEFORE INSERT OR UPDATE ON service_offerings
  FOR EACH ROW EXECUTE FUNCTION service_offerings_search_vector_update();

CREATE INDEX service_offerings_search_idx     ON service_offerings USING GIN(search_vector);
CREATE INDEX service_offerings_provider_idx   ON service_offerings(provider_id);
CREATE INDEX service_offerings_category_idx   ON service_offerings(category_id, status);

-- ─── AVAILABILITY SCHEDULES ──────────────────────────────────────────────────
-- Weekly recurring working hours per service offering.
-- UNIQUE (service_id, day_of_week) limits to one time block per day per service.
-- This is intentional per spec (Section 7.5); providers who work split shifts
-- on the same day are not supported at MVP. Can be extended in Phase 2.

CREATE TABLE availability_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  UNIQUE (service_id, day_of_week),
  CONSTRAINT end_after_start CHECK (end_time > start_time)
);

CREATE INDEX availability_schedules_service_idx ON availability_schedules(service_id);

-- ─── AVAILABILITY BLOCKS ─────────────────────────────────────────────────────
-- Provider manually blocks specific dates (holidays, personal days).

CREATE TABLE availability_blocks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   UUID NOT NULL REFERENCES service_offerings(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  UNIQUE (service_id, blocked_date)
);

CREATE INDEX availability_blocks_service_idx ON availability_blocks(service_id);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
-- HARD RULE: no booking may ever be created with status != 'requested'.
-- Confirmation requires explicit provider action on /api/bookings/[id]/confirm.
-- confirmed_price is set by the provider at confirmation (required for quotes).

CREATE TABLE bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES sellers(id),
  service_id         UUID NOT NULL REFERENCES service_offerings(id),
  buyer_id           UUID NOT NULL REFERENCES users(id),
  requested_datetime TIMESTAMPTZ NOT NULL,
  status             TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN (
                       'requested', 'confirmed', 'completed', 'cancelled', 'no_show'
                     )),
  quote_requested    BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_price    NUMERIC(12, 2),  -- Set by provider at confirmation
  provider_note      TEXT,            -- Provider's message to buyer (on confirm/decline)
  notes              TEXT,            -- Buyer's notes or job description
  address            TEXT,            -- On-site address for provider_travels jobs
  date_created       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_updated       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bookings_date_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_date_updated();

CREATE INDEX bookings_provider_status_idx ON bookings(provider_id, status);
CREATE INDEX bookings_buyer_idx           ON bookings(buyer_id);
CREATE INDEX bookings_service_idx         ON bookings(service_id);
