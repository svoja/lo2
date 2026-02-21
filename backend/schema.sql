-- Logistics DB schema (MySQL).
-- Run: mysql -u root -p < schema.sql   (or run in MySQL Workbench)
-- Then set backend .env: DB_DATABASE=logistics (and DB_HOST, DB_USER, DB_PASSWORD)

CREATE DATABASE IF NOT EXISTS logistics;
USE logistics;

-- Core reference data
CREATE TABLE IF NOT EXISTS branch (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  branch_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7)
);

CREATE TABLE IF NOT EXISTS products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  length DECIMAL(10, 2) COMMENT 'cm',
  width DECIMAL(10, 2) COMMENT 'cm',
  height DECIMAL(10, 2) COMMENT 'cm',
  volume DECIMAL(12, 4) COMMENT 'm3'
);

CREATE TABLE IF NOT EXISTS truck (
  truck_id INT AUTO_INCREMENT PRIMARY KEY,
  plate_number VARCHAR(32) NOT NULL,
  capacity_m3 DECIMAL(10, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'available'
);

-- Orders (depends on branch)
CREATE TABLE IF NOT EXISTS orders (
  order_id INT AUTO_INCREMENT PRIMARY KEY,
  order_date DATE NOT NULL,
  branch_id INT NOT NULL,
  shipment_id INT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Pending',
  total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_volume DECIMAL(12, 4) DEFAULT 0,
  box_count INT DEFAULT 0,
  FOREIGN KEY (branch_id) REFERENCES branch (branch_id)
);

-- Shipment (depends on branch, truck)
CREATE TABLE IF NOT EXISTS shipment (
  shipment_id INT AUTO_INCREMENT PRIMARY KEY,
  origin_branch_id INT NOT NULL,
  destination_branch_id INT NOT NULL,
  truck_id INT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  departure_time DATETIME NULL,
  arrival_time DATETIME NULL,
  total_volume DECIMAL(12, 4) NOT NULL DEFAULT 0,
  FOREIGN KEY (origin_branch_id) REFERENCES branch (branch_id),
  FOREIGN KEY (destination_branch_id) REFERENCES branch (branch_id),
  FOREIGN KEY (truck_id) REFERENCES truck (truck_id)
);

-- Allow orders to reference shipment (after shipment table exists)
ALTER TABLE orders
  ADD CONSTRAINT fk_orders_shipment
  FOREIGN KEY (shipment_id) REFERENCES shipment (shipment_id);

-- Order line items
CREATE TABLE IF NOT EXISTS order_details (
  detail_id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  production_date DATE NULL,
  FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id)
);

-- Shipment <-> Orders many-to-many
CREATE TABLE IF NOT EXISTS shipment_orders (
  shipment_id INT NOT NULL,
  order_id INT NOT NULL,
  PRIMARY KEY (shipment_id, order_id),
  FOREIGN KEY (shipment_id) REFERENCES shipment (shipment_id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders (order_id) ON DELETE CASCADE
);

-- Returns (MySQL reserved word: use backticks in queries if needed)
CREATE TABLE IF NOT EXISTS `returns` (
  return_id INT AUTO_INCREMENT PRIMARY KEY,
  return_date DATE NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Pending',
  total_volume DECIMAL(12, 4) NOT NULL DEFAULT 0,
  order_id INT NOT NULL,
  shipment_id INT NULL,
  FOREIGN KEY (order_id) REFERENCES orders (order_id),
  FOREIGN KEY (shipment_id) REFERENCES shipment (shipment_id)
);

CREATE TABLE IF NOT EXISTS return_details (
  return_detail_id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255) NULL,
  FOREIGN KEY (return_id) REFERENCES `returns` (return_id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products (product_id)
);

-- Optional: minimal seed data so dashboard and tables show something
INSERT INTO branch (branch_name, latitude, longitude) VALUES
  ('Bangkok Hub', 13.7563, 100.5018),
  ('Chiang Mai', 18.7883, 98.9853)
ON DUPLICATE KEY UPDATE branch_id = branch_id;

INSERT INTO products (product_name, unit_price, length, width, height, volume) VALUES
  ('Box Small', 50.00, 20, 20, 20, 0.008),
  ('Box Medium', 120.00, 40, 30, 30, 0.036)
ON DUPLICATE KEY UPDATE product_id = product_id;

INSERT INTO truck (plate_number, capacity_m3, status) VALUES
  ('กก 1234', 10.0, 'available'),
  ('กก 5678', 25.0, 'available')
ON DUPLICATE KEY UPDATE truck_id = truck_id;

-- ถ้าเคยสร้างตาราง shipment ไว้แล้ว (ไม่มี arrival_time) ให้รันคำสั่งนี้ใน DB ที่ใช้อยู่:
-- ALTER TABLE shipment ADD COLUMN arrival_time DATETIME NULL AFTER departure_time;
