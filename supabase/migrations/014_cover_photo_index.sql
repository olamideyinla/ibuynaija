-- 014 Cover photo index (Spec §3.3)
--
-- The `photos` column is already TEXT[] — PostgreSQL arrays are ordered
-- (insertion order is preserved), so no data migration is needed for ordering.
--
-- cover_photo_index: the index into the photos array that the seller has
-- designated as the representative "cover" image.  Defaults to 0 (the first
-- uploaded photo).  All UI surfaces that show a single image for a listing
-- (cards, OG, social share) must read photos[cover_photo_index], not
-- hard-code photos[0].

ALTER TABLE listings
  ADD COLUMN cover_photo_index INTEGER NOT NULL DEFAULT 0;
