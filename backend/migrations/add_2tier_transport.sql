-- 2-Tier Transportation: Linehaul (Manufacturer → DC) + Last Mile (DC → Branch)
-- Manufacturer = location (option C: same pattern as DC, scalable to multiple factories)
-- Run once.

-- 1) Manufacturer table (like distribution: one row per factory/warehouse at a location)
CREATE TABLE IF NOT EXISTS `manufacturer` (
    `manufacturer_id` INT NOT NULL AUTO_INCREMENT,
    `location_id`    INT NOT NULL,
    PRIMARY KEY (`manufacturer_id`),
    CONSTRAINT `fk_manufacturer_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`location_id`) ON DELETE RESTRICT
);

-- 2) Truck: add type for recommendation (Linehaul = big, LastMile = small)
ALTER TABLE truck ADD COLUMN truck_type VARCHAR(20) NULL DEFAULT 'LastMile';
UPDATE truck SET truck_type = 'LastMile' WHERE truck_type IS NULL;

-- 3) Shipment: transport layer + polymorphic origin/destination (Linehaul dest = DC, so destination_branch_id nullable)
ALTER TABLE shipment MODIFY destination_branch_id INT NULL;
ALTER TABLE shipment ADD COLUMN transport_layer VARCHAR(20) NULL COMMENT 'Linehaul | LastMile';
ALTER TABLE shipment ADD COLUMN origin_type VARCHAR(20) NULL COMMENT 'Manufacturer | DC | Branch';
ALTER TABLE shipment ADD COLUMN origin_id INT NULL;
ALTER TABLE shipment ADD COLUMN destination_type VARCHAR(20) NULL COMMENT 'DC | Branch';
ALTER TABLE shipment ADD COLUMN destination_id INT NULL;

-- Backfill existing rows from origin_dc_id / origin_branch_id / destination_branch_id
UPDATE shipment SET
  transport_layer = 'LastMile',
  origin_type = CASE
    WHEN origin_dc_id IS NOT NULL THEN 'DC'
    WHEN origin_branch_id IS NOT NULL THEN 'Branch'
    ELSE NULL
  END,
  origin_id = COALESCE(origin_dc_id, origin_branch_id),
  destination_type = 'Branch',
  destination_id = destination_branch_id
WHERE transport_layer IS NULL;
