-- Multi-stop support: order of DCs on a route, and order of branches per shipment.
-- Run once on existing DB (skip if columns already exist).

ALTER TABLE distribution ADD COLUMN stop_sequence INT NULL COMMENT 'Order of DC on route (1, 2, 3...)';
ALTER TABLE shipment_orders ADD COLUMN stop_sequence INT NULL COMMENT 'Delivery stop order (1, 2, 3...)';
