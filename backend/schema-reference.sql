-- =============================================================================
-- Database schema reference (inferred from backend API)
-- Use this when you don't have a live DB: create DB and run this to match the API.
-- Database: MySQL / MariaDB (mysql2 in Node)
--
-- Tables (order matters for FKs):
--   location, route, distribution, branch, truck, products, shipment, orders,
--   order_details, shipment_orders, returns, return_details
--
-- Design: branch and distribution (DC) use location_id only; name/coordinates
-- live in location. Use views branch_with_location / distribution_with_location
-- for reads; on create/update, create/update location then set location_id.
--
-- Usage:
--   mysql -u user -p -e "CREATE DATABASE your_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--   mysql -u user -p your_db < backend/schema-reference.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Core reference / location
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `location` (
    `location_id`   INT NOT NULL AUTO_INCREMENT,
    `location_name` VARCHAR(255) NOT NULL,
    `latitude`      DECIMAL(10, 7) NULL,
    `longitude`     DECIMAL(10, 7) NULL,
    `address`       VARCHAR(500) NULL,
    PRIMARY KEY (`location_id`)
);

CREATE TABLE IF NOT EXISTS `route` (
    `route_id`          INT NOT NULL AUTO_INCREMENT,
    `route_name`        VARCHAR(255) NOT NULL,
    `start_location_id` INT NULL,
    `end_location_id`   INT NULL,
    PRIMARY KEY (`route_id`),
    CONSTRAINT `fk_route_start_location` FOREIGN KEY (`start_location_id`) REFERENCES `location` (`location_id`) ON DELETE SET NULL,
    CONSTRAINT `fk_route_end_location`   FOREIGN KEY (`end_location_id`)   REFERENCES `location` (`location_id`) ON DELETE SET NULL
);

-- DC and branch use location_id only (name + coordinates live in location).
-- API: JOIN location when reading branch/DC; when creating, create location first then set location_id.
CREATE TABLE IF NOT EXISTS `distribution` (
    `dc_id`         INT NOT NULL AUTO_INCREMENT,
    `location_id`   INT NOT NULL,
    `route_id`      INT NULL,
    `stop_sequence` INT NULL COMMENT 'Order of DC on route (1, 2, 3...)',
    PRIMARY KEY (`dc_id`),
    CONSTRAINT `fk_distribution_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`location_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_distribution_route`     FOREIGN KEY (`route_id`) REFERENCES `route` (`route_id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `branch` (
    `branch_id`    INT NOT NULL AUTO_INCREMENT,
    `location_id`  INT NOT NULL,
    `dc_id`        INT NULL,
    PRIMARY KEY (`branch_id`),
    CONSTRAINT `fk_branch_location` FOREIGN KEY (`location_id`) REFERENCES `location` (`location_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_branch_dc`        FOREIGN KEY (`dc_id`) REFERENCES `distribution` (`dc_id`) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Truck
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `truck` (
    `truck_id`    INT NOT NULL AUTO_INCREMENT,
    `plate_number` VARCHAR(50) NOT NULL,
    `capacity_m3` DECIMAL(10, 2) NOT NULL,
    `status`      VARCHAR(50) NOT NULL DEFAULT 'available',
    PRIMARY KEY (`truck_id`)
);

-- -----------------------------------------------------------------------------
-- Products
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
    `product_id`   INT NOT NULL AUTO_INCREMENT,
    `product_name` VARCHAR(255) NOT NULL,
    `unit_price`   DECIMAL(12, 2) NOT NULL,
    `length`       DECIMAL(10, 2) NULL COMMENT 'cm',
    `width`        DECIMAL(10, 2) NULL COMMENT 'cm',
    `height`       DECIMAL(10, 2) NULL COMMENT 'cm',
    `volume`       DECIMAL(12, 6) NULL COMMENT 'm3 per unit',
    PRIMARY KEY (`product_id`)
);

-- -----------------------------------------------------------------------------
-- Shipment (before orders so we can reference branches/truck)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shipment` (
    `shipment_id`             INT NOT NULL AUTO_INCREMENT,
    `origin_branch_id`        INT NOT NULL,
    `destination_branch_id`   INT NOT NULL,
    `truck_id`                INT NULL,
    `status`                  VARCHAR(50) NULL DEFAULT 'pending',
    `shipment_type`           VARCHAR(50) NOT NULL DEFAULT 'Outbound',
    `departure_time`          DATETIME NULL,
    `arrival_time`            DATETIME NULL,
    `total_volume`            DECIMAL(14, 4) NULL DEFAULT 0,
    `receipt_notes`           TEXT NULL,
    `receipt_damage`          VARCHAR(500) NULL,
    PRIMARY KEY (`shipment_id`),
    CONSTRAINT `fk_shipment_origin`    FOREIGN KEY (`origin_branch_id`)      REFERENCES `branch` (`branch_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_shipment_destination` FOREIGN KEY (`destination_branch_id`) REFERENCES `branch` (`branch_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_shipment_truck`     FOREIGN KEY (`truck_id`)              REFERENCES `truck` (`truck_id`) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Orders (references branch, optional shipment)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
    `order_id`       INT NOT NULL AUTO_INCREMENT,
    `branch_id`      INT NOT NULL,
    `order_date`     DATE NOT NULL,
    `shipment_id`    INT NULL,
    `status`         VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `total_amount`   DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `total_volume`   DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `box_count`      INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`order_id`),
    CONSTRAINT `fk_orders_branch`   FOREIGN KEY (`branch_id`)   REFERENCES `branch` (`branch_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_orders_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipment` (`shipment_id`) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Order details (line items)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_details` (
    `detail_id`       INT NOT NULL AUTO_INCREMENT,
    `order_id`        INT NOT NULL,
    `product_id`      INT NOT NULL,
    `quantity`        INT NOT NULL,
    `production_date` DATE NULL,
    PRIMARY KEY (`detail_id`),
    CONSTRAINT `fk_order_details_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders` (`order_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_order_details_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- Shipment – Orders (many-to-many)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `shipment_orders` (
    `shipment_id`   INT NOT NULL,
    `order_id`     INT NOT NULL,
    `stop_sequence` INT NULL COMMENT 'Delivery stop order (1, 2, 3...)',
    PRIMARY KEY (`shipment_id`, `order_id`),
    CONSTRAINT `fk_shipment_orders_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipment` (`shipment_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_shipment_orders_order`   FOREIGN KEY (`order_id`)    REFERENCES `orders` (`order_id`) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- Returns (reserved word in MySQL, so use backticks in queries)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `returns` (
    `return_id`     INT NOT NULL AUTO_INCREMENT,
    `return_date`   DATE NULL,
    `status`        VARCHAR(50) NULL DEFAULT 'Pending',
    `total_volume`  DECIMAL(14, 4) NULL DEFAULT 0,
    `order_id`      INT NOT NULL,
    `shipment_id`   INT NULL,
    PRIMARY KEY (`return_id`),
    CONSTRAINT `fk_returns_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders` (`order_id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_returns_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipment` (`shipment_id`) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Return details (line items)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `return_details` (
    `return_detail_id` INT NOT NULL AUTO_INCREMENT,
    `return_id`        INT NOT NULL,
    `product_id`       INT NOT NULL,
    `quantity`         INT NOT NULL,
    `reason`           VARCHAR(500) NULL,
    PRIMARY KEY (`return_detail_id`),
    CONSTRAINT `fk_return_details_return`  FOREIGN KEY (`return_id`)  REFERENCES `returns` (`return_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_return_details_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- Views: expose branch/DC with name and coordinates from location
-- (so existing API can SELECT branch_name, latitude, longitude without code change)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW `branch_with_location` AS
SELECT b.branch_id, b.location_id, l.location_name AS branch_name, l.latitude, l.longitude, b.dc_id
FROM branch b
JOIN location l ON b.location_id = l.location_id;

CREATE OR REPLACE VIEW `distribution_with_location` AS
SELECT d.dc_id, l.location_name AS dc_name, l.latitude, l.longitude, d.route_id
FROM distribution d
JOIN location l ON d.location_id = l.location_id;

-- -----------------------------------------------------------------------------
-- Optional: set return_date on insert (if your API expects it)
-- -----------------------------------------------------------------------------
-- ALTER TABLE `returns` MODIFY COLUMN `return_date` DATE NULL DEFAULT (CURDATE());
