-- Inbound receive: store optional receipt notes and damage when receiving a shipment.
-- Run once (skip if columns already exist):
--   ALTER TABLE shipment ADD COLUMN receipt_notes TEXT NULL;
--   ALTER TABLE shipment ADD COLUMN receipt_damage VARCHAR(500) NULL;

ALTER TABLE shipment ADD COLUMN receipt_notes TEXT NULL;
ALTER TABLE shipment ADD COLUMN receipt_damage VARCHAR(500) NULL;
