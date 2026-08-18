-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002: Categories
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  section    TEXT NOT NULL CHECK (section IN ('marketplace', 'services')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─── MARKETPLACE CATEGORIES ──────────────────────────────────────────────────
-- Exactly the 9 categories in the spec (Section 1.3).
-- BANNED: Electronics, Phones & Tablets, Vehicles — never add these.

INSERT INTO categories (name, slug, section, sort_order) VALUES
  ('Fashion & Textiles',         'fashion-textiles',          'marketplace', 1),
  ('Beauty & Personal Care',     'beauty-personal-care',      'marketplace', 2),
  ('Hair (Wigs, Weaves & Extensions)', 'hair-wigs-weaves',   'marketplace', 3),
  ('Furniture & Interior Décor', 'furniture-interior-decor',  'marketplace', 4),
  ('Food, Spices & Pantry',      'food-spices-pantry',        'marketplace', 5),
  ('Arts, Crafts & Home Décor',  'arts-crafts-home-decor',    'marketplace', 6),
  ('Jewelry & Accessories',      'jewelry-accessories',       'marketplace', 7),
  ('Agro-Products (Raw/Bulk)',    'agro-products',             'marketplace', 8),
  ('Creative & Media',           'creative-media',            'marketplace', 9);

-- ─── SERVICES CATEGORIES ─────────────────────────────────────────────────────
-- Exactly the 5 categories in the spec (Section 2.1).

INSERT INTO categories (name, slug, section, sort_order) VALUES
  ('Hair & Grooming',             'hair-grooming',             'services', 1),
  ('Home Trades',                 'home-trades',               'services', 2),
  ('Tailoring & Fashion Services','tailoring-fashion',         'services', 3),
  ('Cleaning Services',           'cleaning-services',         'services', 4),
  ('Event Services',              'event-services',            'services', 5);
