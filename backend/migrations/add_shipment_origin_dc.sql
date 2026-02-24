-- Origin can be DC (distribution center) for create-with-orders flow.
-- Run once (skip if column already exists).

ALTER TABLE shipment MODIFY origin_branch_id INT NULL;
ALTER TABLE shipment ADD COLUMN origin_dc_id INT NULL;
ALTER TABLE shipment ADD CONSTRAINT fk_shipment_origin_dc FOREIGN KEY (origin_dc_id) REFERENCES distribution(dc_id) ON DELETE SET NULL;
