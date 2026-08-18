-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data for ibuynaija.com
-- Realistic Nigerian marketplace data for local dev and testing.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ADMIN USERS ─────────────────────────────────────────────────────────────
-- password_hash = bcrypt of 'Admin@ibuynaija1' (for dev only)
INSERT INTO admin_users (id, name, email, password_hash, role) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'Chidi Okonkwo',
   'admin@ibuynaija.com',
   '$2b$10$QT7OIFhqIKP2k0wJTtD/K.XQQWEd7PZ6IxcoDkS0Y7qxsL69VU/9e',
   'super_admin');

-- ─── USERS ───────────────────────────────────────────────────────────────────
INSERT INTO users (id, phone, email, is_buyer, is_seller, is_service_provider,
                   location_state, location_city, date_joined)
VALUES
  -- Seller 1: verified Ankara fashion seller in Lagos
  ('10000000-0000-0000-0000-000000000001',
   '+2348012345601', 'adaeze@example.com',
   FALSE, TRUE, FALSE, 'Lagos', 'Lagos Island', NOW() - INTERVAL '120 days'),

  -- Seller 2: beauty & hair seller in Abuja
  ('10000000-0000-0000-0000-000000000002',
   '+2348012345602', 'ngozi@example.com',
   FALSE, TRUE, FALSE, 'Abuja', 'Wuse 2', NOW() - INTERVAL '90 days'),

  -- Seller 3: furniture maker in Oyo
  ('10000000-0000-0000-0000-000000000003',
   '+2348012345603', 'emeka@example.com',
   TRUE, TRUE, FALSE, 'Oyo', 'Ibadan', NOW() - INTERVAL '60 days'),

  -- Seller 4: food & spices in Lagos (unverified)
  ('10000000-0000-0000-0000-000000000004',
   '+2348012345604', 'tunde@example.com',
   FALSE, TRUE, FALSE, 'Lagos', 'Surulere', NOW() - INTERVAL '45 days'),

  -- Service provider: hairdresser in Lagos
  ('10000000-0000-0000-0000-000000000005',
   '+2348012345605', 'amaka@example.com',
   FALSE, FALSE, TRUE, 'Lagos', 'Victoria Island', NOW() - INTERVAL '30 days'),

  -- Buyer 1: Lagos buyer
  ('20000000-0000-0000-0000-000000000001',
   '+2348012345610', 'buyer1@example.com',
   TRUE, FALSE, FALSE, 'Lagos', 'Ikeja', NOW() - INTERVAL '50 days'),

  -- Buyer 2: diaspora / Abuja buyer
  ('20000000-0000-0000-0000-000000000002',
   '+2348012345611', 'buyer2@example.com',
   TRUE, FALSE, FALSE, 'Abuja', 'Garki', NOW() - INTERVAL '20 days'),

  -- Seller + buyer (dual role)
  ('30000000-0000-0000-0000-000000000001',
   '+2348012345620', 'chisom@example.com',
   TRUE, TRUE, FALSE, 'Rivers', 'Port Harcourt', NOW() - INTERVAL '75 days');

-- ─── SELLERS ─────────────────────────────────────────────────────────────────
INSERT INTO sellers (id, user_id, slug, business_name, tagline, description,
                     state, city_area,
                     bank_account_name, bank_account_number, bank_name,
                     verification_requested, verified_status, verified_date, verified_by,
                     provider_type, date_created)
VALUES
  -- Seller 1: verified Ankara seller
  ('a0000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'adaeze-ankara',
   'Adaeze Ankara & Prints',
   'Authentic Ankara, straight from Lagos to your door',
   'We create stunning ready-to-wear Ankara and Adire pieces for every occasion. '
   'All fabrics are sourced from Nigerian textile mills. Worldwide shipping available.',
   'Lagos', 'Lagos Island',
   'ADAEZE ANKARA AND PRINTS', '0123456789', 'First Bank',
   TRUE, TRUE, NOW() - INTERVAL '80 days', '00000000-0000-0000-0000-000000000001',
   'seller', NOW() - INTERVAL '120 days'),

  -- Seller 2: beauty seller
  ('a0000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   'ngozi-beauty',
   'Ngozi Natural Beauty',
   'Pure shea butter, black soap & natural skincare from Nigeria',
   'We handcraft all our products in Abuja using 100% natural Nigerian ingredients. '
   'No parabens, no sulphates — just what nature gave us.',
   'Abuja', 'Wuse 2',
   'NGOZI NATURAL BEAUTY', '0234567890', 'GTBank',
   TRUE, TRUE, NOW() - INTERVAL '50 days', '00000000-0000-0000-0000-000000000001',
   'seller', NOW() - INTERVAL '90 days'),

  -- Seller 3: furniture maker (dual buyer+seller, unverified but requested)
  ('a0000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000003',
   'emeka-furniture',
   'Emeka Wood & Craft',
   'Bespoke Nigerian hardwood furniture, built to last',
   'Based in Ibadan, we craft solid Nigerian hardwood furniture — dining sets, '
   'wardrobes, and custom pieces. Lead time 2–4 weeks. Delivery within Nigeria.',
   'Oyo', 'Ibadan',
   'EMEKA WOOD AND CRAFT', '0345678901', 'Access Bank',
   TRUE, FALSE, NULL, NULL,
   'seller', NOW() - INTERVAL '60 days'),

  -- Seller 4: food & spices (no verification requested)
  ('a0000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000004',
   'tunde-spices',
   'Tunde Spice Co.',
   'Genuine Nigerian spices and dried foods, packaged fresh weekly',
   'We source, dry, and package spices from Nigerian farms every week. '
   'Suya spice, uziza, ogiri, crayfish — pure and unblended.',
   'Lagos', 'Surulere',
   'TUNDE SPICE CO', '0456789012', 'Zenith Bank',
   FALSE, FALSE, NULL, NULL,
   'seller', NOW() - INTERVAL '45 days'),

  -- Service provider: hairdresser
  ('a0000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000005',
   'amaka-hair',
   'Amaka Hair Studio',
   'Braids, twists & natural hair care in Victoria Island',
   'Specialising in knotless braids, Fulani braids, twists, and loc maintenance. '
   'We come to you or you come to us — your choice.',
   'Lagos', 'Victoria Island',
   'AMAKA HAIR STUDIO', '0567890123', 'UBA',
   FALSE, FALSE, NULL, NULL,
   'provider', NOW() - INTERVAL '30 days'),

  -- Dual-role seller (chisom)
  ('a0000000-0000-0000-0000-000000000006',
   '30000000-0000-0000-0000-000000000001',
   'chisom-crafts',
   'Chisom Crafts & Beads',
   'Handmade Nigerian beadwork, jewellery & home accessories',
   'Every piece is hand-crafted in Port Harcourt. We ship worldwide.',
   'Rivers', 'Port Harcourt',
   'CHISOM CRAFTS AND BEADS', '0678901234', 'Fidelity Bank',
   FALSE, FALSE, NULL, NULL,
   'seller', NOW() - INTERVAL '75 days');

-- ─── LISTINGS ────────────────────────────────────────────────────────────────
-- Covers multiple categories and statuses (active, sold, expired).
-- All made_in_nigeria = TRUE (required for status = 'active').

INSERT INTO listings (id, seller_id, title, description, category_id, price,
                      photos, made_in_nigeria, condition, status, date_posted)
VALUES
  -- Adaeze Ankara: 3 active listings
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Ankara Maxi Wrap Dress — Blue & Gold',
   'Stunning A-line wrap dress in vibrant blue-and-gold Ankara print. '
   'Made from 6 yards of premium Dutch wax fabric. Available in sizes S–3XL. '
   'Each dress is hand-cut and sewn by our Lagos-based tailors.',
   (SELECT id FROM categories WHERE slug = 'fashion-textiles'),
   28500.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '100 days'),

  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   'Adire Tie-Dye Set (Top & Skirt)',
   'Hand-dyed indigo Adire two-piece set. The fabric is tie-dyed using traditional '
   'Yoruba resist-dyeing methods. One size, adjustable waist on skirt.',
   (SELECT id FROM categories WHERE slug = 'fashion-textiles'),
   19500.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '85 days'),

  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'Ankara Tote Bag — Kente Mix Print',
   'Sturdy Ankara fabric tote bag with canvas lining, zip closure, and inner pocket. '
   'Perfect for the market or beach. Fits a 15" laptop.',
   (SELECT id FROM categories WHERE slug = 'fashion-textiles'),
   7500.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '70 days'),

  -- Ngozi Beauty: 2 active, 1 sold
  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000002',
   'Raw Unrefined Shea Butter — 500g',
   'Grade A raw shea butter sourced directly from cooperatives in northern Nigeria. '
   'Unprocessed, no added ingredients. Ideal for body moisturising and hair conditioning.',
   (SELECT id FROM categories WHERE slug = 'beauty-personal-care'),
   4200.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '80 days'),

  ('b0000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000002',
   'Nigerian Black Soap with Shea & Honey — 200g',
   'Handmade traditional Dudu Osun-style black soap enriched with locally sourced '
   'shea butter and raw honey. Suitable for all skin types including sensitive skin.',
   (SELECT id FROM categories WHERE slug = 'beauty-personal-care'),
   2800.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '75 days'),

  ('b0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000002',
   'Natural Hair Growth Oil — Baobab & Black Castor',
   'Blend of Nigerian black castor oil and baobab oil for scalp health and hair growth. '
   'This batch has sold out.',
   (SELECT id FROM categories WHERE slug = 'beauty-personal-care'),
   3500.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'sold', NOW() - INTERVAL '110 days'),

  -- Emeka Furniture: price-on-request + active item
  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000003',
   'Custom Nigerian Hardwood Dining Set (6-Seater)',
   'Bespoke 6-seater dining table and chairs crafted from solid Nigerian iroko wood. '
   'Choose your finish: natural, mahogany stain, or walnut. '
   'Lead time: 3–4 weeks. Delivery within Ibadan free; Lagos delivery N15,000.',
   (SELECT id FROM categories WHERE slug = 'furniture-interior-decor'),
   NULL,   -- Price on request
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '55 days'),

  ('b0000000-0000-0000-0000-000000000008',
   'a0000000-0000-0000-0000-000000000003',
   'Handwoven Rattan Storage Basket Set (3 sizes)',
   'Set of 3 hand-woven rattan baskets made by artisans in Oyo State. '
   'Perfect for towels, fruits, or general storage. Dimensions: S 20cm, M 30cm, L 40cm.',
   (SELECT id FROM categories WHERE slug = 'furniture-interior-decor'),
   12500.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '40 days'),

  -- Tunde Spices: 2 active listings
  ('b0000000-0000-0000-0000-000000000009',
   'a0000000-0000-0000-0000-000000000004',
   'Suya Spice Blend — 100g',
   'Authentic suya spice (yaji) ground and blended to the original Hausa recipe. '
   'Contains groundnut, ginger, paprika, and other spices. No MSG, no preservatives.',
   (SELECT id FROM categories WHERE slug = 'food-spices-pantry'),
   1800.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '30 days'),

  ('b0000000-0000-0000-0000-000000000010',
   'a0000000-0000-0000-0000-000000000004',
   'Dried Uziza Leaves — 50g',
   'Sun-dried uziza leaves from fresh farm harvest in Rivers State. '
   'Perfect for ofe akwu and ofe nsala soups. Packed in sealed foil bags.',
   (SELECT id FROM categories WHERE slug = 'food-spices-pantry'),
   1200.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '25 days'),

  -- Chisom Crafts: beads listing
  ('b0000000-0000-0000-0000-000000000011',
   'a0000000-0000-0000-0000-000000000006',
   'Waist Beads Set — Traditional Igbo Colours (3 strands)',
   'Handmade waist beads using glass seed beads in the traditional red, white, and '
   'green Igbo palette. Tied-on style, adjustable. Each set is handmade to order.',
   (SELECT id FROM categories WHERE slug = 'jewelry-accessories'),
   5500.00,
   ARRAY['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
   TRUE, 'new', 'active', NOW() - INTERVAL '60 days');

-- ─── LISTING VARIANTS ────────────────────────────────────────────────────────
-- One implicit variant per listing (attributes = {}) so Add-to-Cart / Buy-Now work.
-- stock_count = 10 for all seed listings.
INSERT INTO listing_variants (listing_id, attributes, price_override, stock_count)
VALUES
  ('b0000000-0000-0000-0000-000000000001', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000002', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000003', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000004', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000005', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000006', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000007', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000008', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000009', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000010', '{}', NULL, 10),
  ('b0000000-0000-0000-0000-000000000011', '{}', NULL, 10);

-- ─── SERVICE OFFERINGS ───────────────────────────────────────────────────────
INSERT INTO service_offerings (id, provider_id, name, category_id, description,
                               price_type, price, price_from, duration_minutes,
                               location_type, status, date_created)
VALUES
  ('c0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000005',
   'Knotless Box Braids (Medium)',
   (SELECT id FROM categories WHERE slug = 'hair-grooming'),
   'Medium-sized knotless box braids using premium synthetic hair. '
   'Includes wash and blow-dry before braiding. Duration: 5–6 hours. '
   'We travel to you within Lagos Island, VI, and Ikoyi.',
   'fixed', 35000.00, NULL, 330,
   'provider_travels', 'active', NOW() - INTERVAL '25 days'),

  ('c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000005',
   'Loc Retwist & Moisturise',
   (SELECT id FROM categories WHERE slug = 'hair-grooming'),
   'Retwist for all loc sizes, with deep conditioning and oiling. '
   'At our studio in Victoria Island or we travel to you (Lagos only).',
   'fixed', 15000.00, NULL, 90,
   'at_provider', 'active', NOW() - INTERVAL '25 days'),

  ('c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000005',
   'Custom Hair Consultation & Style Plan',
   (SELECT id FROM categories WHERE slug = 'hair-grooming'),
   'A 1-hour consultation to assess your hair health and recommend a personalised '
   'care and styling routine. Price depends on hair length and condition.',
   'quote', NULL, 5000.00, 60,
   'at_provider', 'active', NOW() - INTERVAL '20 days');

-- ─── AVAILABILITY SCHEDULES ──────────────────────────────────────────────────
-- Amaka Hair Studio: Tue–Sat, 9am–6pm (day_of_week: 2=Tue ... 6=Sat)
INSERT INTO availability_schedules (service_id, day_of_week, start_time, end_time)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 2, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000001', 3, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000001', 4, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000001', 5, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000001', 6, '09:00', '18:00'),

  ('c0000000-0000-0000-0000-000000000002', 2, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000002', 3, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000002', 4, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000002', 5, '09:00', '18:00'),
  ('c0000000-0000-0000-0000-000000000002', 6, '09:00', '18:00'),

  ('c0000000-0000-0000-0000-000000000003', 2, '10:00', '16:00'),
  ('c0000000-0000-0000-0000-000000000003', 4, '10:00', '16:00');

-- ─── ENQUIRIES ───────────────────────────────────────────────────────────────
INSERT INTO enquiries (buyer_id, listing_id, date_created)
VALUES
  -- Buyer 1 enquired about the furniture set (gates rating)
  ('20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000007',
   NOW() - INTERVAL '30 days'),
  -- Buyer 2 enquired about the Ankara dress
  ('20000000-0000-0000-0000-000000000002',
   'b0000000-0000-0000-0000-000000000001',
   NOW() - INTERVAL '15 days'),
  -- Chisom (dual-role buyer) enquired about shea butter
  ('30000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000004',
   NOW() - INTERVAL '10 days');

-- ─── CHECKOUT SESSIONS & ORDERS ──────────────────────────────────────────────

-- CheckoutSession 1: Buyer 1 bought from Adaeze and Tunde in one session
INSERT INTO checkout_sessions (id, buyer_id, delivery_method, delivery_address,
                               buyer_phone, buyer_email, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'delivery',
   '14 Mobolaji Johnson Avenue, Ikeja, Lagos',
   '+2348012345610',
   'buyer1@example.com',
   NOW() - INTERVAL '20 days');

-- Order 1a: from Adaeze (fulfilled)
INSERT INTO orders (id, checkout_session_id, buyer_id, seller_id,
                    line_items, total, status, date_created, date_updated)
VALUES
  ('e0000000-0000-0000-0000-000000000001',
   'd0000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   '[{"listing_id":"b0000000-0000-0000-0000-000000000001","title":"Ankara Maxi Wrap Dress — Blue & Gold","qty":1,"unit_price":28500.00},{"listing_id":"b0000000-0000-0000-0000-000000000003","title":"Ankara Tote Bag — Kente Mix Print","qty":2,"unit_price":7500.00}]'::jsonb,
   43500.00,
   'fulfilled',
   NOW() - INTERVAL '20 days',
   NOW() - INTERVAL '15 days');

-- Order 1b: from Tunde (payment_claimed)
INSERT INTO orders (id, checkout_session_id, buyer_id, seller_id,
                    line_items, total, status, date_created, date_updated)
VALUES
  ('e0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000004',
   '[{"listing_id":"b0000000-0000-0000-0000-000000000009","title":"Suya Spice Blend — 100g","qty":3,"unit_price":1800.00}]'::jsonb,
   5400.00,
   'payment_claimed',
   NOW() - INTERVAL '20 days',
   NOW() - INTERVAL '18 days');

-- CheckoutSession 2: Buyer 2 bought shea butter (awaiting payment)
INSERT INTO checkout_sessions (id, buyer_id, delivery_method, delivery_address,
                               buyer_phone, buyer_email, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'delivery',
   '5 Herbert Macaulay Way, Garki, Abuja',
   '+2348012345611',
   'buyer2@example.com',
   NOW() - INTERVAL '5 days');

-- Order 2: awaiting payment
INSERT INTO orders (id, checkout_session_id, buyer_id, seller_id,
                    line_items, total, status, date_created, date_updated)
VALUES
  ('e0000000-0000-0000-0000-000000000003',
   'd0000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   '[{"listing_id":"b0000000-0000-0000-0000-000000000004","title":"Raw Unrefined Shea Butter — 500g","qty":2,"unit_price":4200.00}]'::jsonb,
   8400.00,
   'awaiting_payment',
   NOW() - INTERVAL '5 days',
   NOW() - INTERVAL '5 days');

-- ─── RATINGS ─────────────────────────────────────────────────────────────────
-- Buyer 1 rates Adaeze's dress after fulfilled order (eligibility: has order)
INSERT INTO ratings (buyer_id, listing_id,
                     buying_experience_score, product_quality_score,
                     comment, date_created)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   'b0000000-0000-0000-0000-000000000001',
   5, 5,
   'Absolutely beautiful dress! The fabric quality is excellent and delivery was fast. '
   'Will definitely order again.',
   NOW() - INTERVAL '12 days');

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
-- Booking 1: confirmed knotless braids
INSERT INTO bookings (id, provider_id, service_id, buyer_id,
                      requested_datetime, status, quote_requested,
                      confirmed_price, notes, address, date_created)
VALUES
  ('f0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001',
   NOW() + INTERVAL '3 days',
   'confirmed',
   FALSE,
   35000.00,
   'Please bring waist-length extensions',
   '14 Mobolaji Johnson Avenue, Ikeja, Lagos',
   NOW() - INTERVAL '2 days');

-- Booking 2: requested loc retwist (pending provider action)
INSERT INTO bookings (id, provider_id, service_id, buyer_id,
                      requested_datetime, status, quote_requested,
                      notes, date_created)
VALUES
  ('f0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000002',
   NOW() + INTERVAL '7 days',
   'requested',
   FALSE,
   'I have medium-sized locs, about 80 of them',
   NOW() - INTERVAL '1 day');

-- Booking 3: quote request for hair consultation
INSERT INTO bookings (id, provider_id, service_id, buyer_id,
                      requested_datetime, status, quote_requested,
                      notes, date_created)
VALUES
  ('f0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000005',
   'c0000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000001',
   NOW() + INTERVAL '5 days',
   'requested',
   TRUE,
   'I have 4c hair, shoulder length, and lots of breakage. Looking for a plan.',
   NOW() - INTERVAL '6 hours');

-- ─── LISTING REPORT (for admin testing) ─────────────────────────────────────
INSERT INTO listing_reports (listing_id, reporter_id, reason, details)
VALUES
  ('b0000000-0000-0000-0000-000000000009',
   '20000000-0000-0000-0000-000000000002',
   'not_made_in_nigeria',
   'I received this spice and the packaging says it was blended in Ghana, not Nigeria.');

-- ─── VERIFICATION NOTE ───────────────────────────────────────────────────────
INSERT INTO verification_notes (seller_id, admin_id, text)
VALUES
  ('a0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Seller submitted photos of Ankara inventory and Lagos workshop. '
   'Business WhatsApp active. Approved on first review.'),

  ('a0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Ngozi Beauty has consistent sales history and a well-maintained Instagram profile. '
   'Products are clearly handmade. Approved.');

-- ─── REVENUE DASHBOARD SEED DATA (Section 3.5b) ──────────────────────────────
-- Additional fulfilled orders, offline sales, expenses, and promotions for
-- Adaeze (seller a001) spanning two months for dashboard demo purposes.

-- Two more checkout sessions (last month)
INSERT INTO checkout_sessions (id, buyer_id, delivery_method, delivery_address,
                               buyer_phone, buyer_email, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000001',
   'delivery', '14 Mobolaji Johnson Avenue, Ikeja, Lagos',
   '+2348012345610', 'buyer1@example.com',
   NOW() - INTERVAL '48 days'),

  ('d0000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000002',
   'pickup', NULL,
   '+2348012345611', 'buyer2@example.com',
   NOW() - INTERVAL '38 days'),

-- One more checkout session (this month)
  ('d0000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000002',
   'delivery', '5 Herbert Macaulay Way, Garki, Abuja',
   '+2348012345611', 'buyer2@example.com',
   NOW() - INTERVAL '9 days');

-- Additional fulfilled orders for Adaeze — last month
INSERT INTO orders (id, checkout_session_id, buyer_id, seller_id,
                    line_items, total, status, date_created, date_updated)
VALUES
  -- ₦57,000: 2× Ankara Maxi Dress (last month)
  ('e0000000-0000-0000-0000-000000000004',
   'd0000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   '[{"listing_id":"b0000000-0000-0000-0000-000000000001","title":"Ankara Maxi Wrap Dress — Blue & Gold","qty":2,"unit_price":28500.00}]'::jsonb,
   57000.00, 'fulfilled',
   NOW() - INTERVAL '48 days', NOW() - INTERVAL '44 days'),

  -- ₦19,500: 1× Adire Set (last month)
  ('e0000000-0000-0000-0000-000000000005',
   'd0000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   '[{"listing_id":"b0000000-0000-0000-0000-000000000002","title":"Adire Tie-Dye Set (Top & Skirt)","qty":1,"unit_price":19500.00}]'::jsonb,
   19500.00, 'fulfilled',
   NOW() - INTERVAL '38 days', NOW() - INTERVAL '35 days'),

  -- ₦15,000: 2× Ankara Tote Bag (this month)
  ('e0000000-0000-0000-0000-000000000006',
   'd0000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   '[{"listing_id":"b0000000-0000-0000-0000-000000000003","title":"Ankara Tote Bag — Kente Mix Print","qty":2,"unit_price":7500.00}]'::jsonb,
   15000.00, 'fulfilled',
   NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days');

-- Offline sales for Adaeze
INSERT INTO offline_sales (seller_id, amount, date, note, listing_id, variant_id, quantity)
VALUES
  -- Last month: freestanding sales (no listing)
  ('a0000000-0000-0000-0000-000000000001',
   35000.00, CURRENT_DATE - INTERVAL '50 days',
   'Custom Ankara order — client from Balogun market', NULL, NULL, 1),

  ('a0000000-0000-0000-0000-000000000001',
   12000.00, CURRENT_DATE - INTERVAL '41 days',
   'Fashion fair at Eko Convention Centre, 4 small items', NULL, NULL, 1),

  -- This month: freestanding WhatsApp order
  ('a0000000-0000-0000-0000-000000000001',
   24000.00, CURRENT_DATE - INTERVAL '11 days',
   'WhatsApp direct order — Ankara mini dress (custom size)', NULL, NULL, 1),

  -- This month: linked to Adire Set listing (stock decrement handled separately)
  ('a0000000-0000-0000-0000-000000000001',
   19500.00, CURRENT_DATE - INTERVAL '6 days',
   'Sold at Lekki Arts & Craft market',
   'b0000000-0000-0000-0000-000000000002',
   (SELECT id FROM listing_variants WHERE listing_id = 'b0000000-0000-0000-0000-000000000002' LIMIT 1),
   1);

-- Expenses for Adaeze
INSERT INTO expenses (seller_id, amount, date, category, note)
VALUES
  ('a0000000-0000-0000-0000-000000000001',
   18000.00, CURRENT_DATE - INTERVAL '52 days',
   'Fabric & materials', 'Ankara Dutch wax — 20 yards from Balogun'),

  ('a0000000-0000-0000-0000-000000000001',
   5500.00, CURRENT_DATE - INTERVAL '46 days',
   'Delivery costs', 'GIG Logistics — 3 orders to Abuja and PH'),

  ('a0000000-0000-0000-0000-000000000001',
   3000.00, CURRENT_DATE - INTERVAL '43 days',
   'Market & stall fees', 'Fashion fair stall rental — Eko Hotel'),

  ('a0000000-0000-0000-0000-000000000001',
   22000.00, CURRENT_DATE - INTERVAL '13 days',
   'Fabric & materials', 'New Ankara stock — 30 yards mixed prints'),

  ('a0000000-0000-0000-0000-000000000001',
   4200.00, CURRENT_DATE - INTERVAL '8 days',
   'Packaging', 'Printed bags, tissue paper, and thank-you cards'),

  ('a0000000-0000-0000-0000-000000000001',
   2800.00, CURRENT_DATE - INTERVAL '4 days',
   'Delivery costs', 'Courier — 2 Lagos orders this week');

-- Promotions for Adaeze
INSERT INTO promotions (seller_id, scope, listing_id, discount_type, discount_value,
                        start_date, end_date)
VALUES
  -- Last month: 10% off Ankara Maxi Dress
  ('a0000000-0000-0000-0000-000000000001',
   'single_listing',
   'b0000000-0000-0000-0000-000000000001',
   'percentage', 10.00,
   NOW() - INTERVAL '55 days', NOW() - INTERVAL '25 days'),

  -- This month: ₦1,500 off Ankara Tote Bag (still active)
  ('a0000000-0000-0000-0000-000000000001',
   'single_listing',
   'b0000000-0000-0000-0000-000000000003',
   'fixed_amount', 1500.00,
   NOW() - INTERVAL '14 days', NOW() + INTERVAL '7 days');
