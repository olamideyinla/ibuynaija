-- 015 Expanded categories
--
-- Marketplace additions (sort_order 10–13):
--   Cultural Heritage & Souvenirs  — bronzes, woodcarvings, masks, beadwork, pottery
--   Health, Wellness & Herbs       — herbal remedies, black soap, shea butter, natural oils
--   Bags, Wallets & Leather Goods  — Aba leather cluster: handbags, wallets, belts, sandals
--   Kids & Baby                    — Nigerian-made children's clothing, toys, nursery items
--
-- Services additions (sort_order 6–9):
--   Tourism, Travel & Concierge    — tour guides, city tours, airport pickups, experiences
--   Photography & Videography      — product photography, events, drone footage
--   Catering & Food Services       — event catering, meal prep, cooking classes, chefs-for-hire
--   Digital & Tech Services        — web design, social media, graphic design, printing

-- ─── MARKETPLACE ─────────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, section, sort_order) VALUES
  ('Cultural Heritage & Souvenirs', 'cultural-heritage-souvenirs', 'marketplace', 10),
  ('Health, Wellness & Herbs',      'health-wellness-herbs',       'marketplace', 11),
  ('Bags, Wallets & Leather Goods', 'bags-leather-goods',          'marketplace', 12),
  ('Kids & Baby',                   'kids-baby',                   'marketplace', 13);

-- ─── SERVICES ─────────────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, section, sort_order) VALUES
  ('Tourism, Travel & Concierge', 'tourism-travel-concierge',  'services', 6),
  ('Photography & Videography',   'photography-videography',   'services', 7),
  ('Catering & Food Services',    'catering-food-services',    'services', 8),
  ('Digital & Tech Services',     'digital-tech-services',     'services', 9);
