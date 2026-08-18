-- Migration 017: Add WhatsApp number + delivery zones to sellers,
-- and delivery_fee column to orders.

ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS delivery_zones  JSONB NOT NULL DEFAULT '{}';
-- delivery_zones format: { "Lagos": 2000, "FCT (Abuja)": 3500, "__default__": 1500 }
-- __default__ = fee for any state not explicitly listed
-- Absent key + no __default__ = fee not configured for that state (show "TBD")

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
