-- 018 User phone2 + seller_applications CAC certificate
-- Adds a second phone number field to users, and a CAC certificate
-- image URL to seller applications for identity/business verification.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone2 TEXT;

ALTER TABLE seller_applications
  ADD COLUMN IF NOT EXISTS cac_certificate_url TEXT;
