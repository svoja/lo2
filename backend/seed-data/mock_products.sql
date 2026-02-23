-- Mock/sample products for reference and testing.
-- Run after schema and tables exist: mysql -u user -p your_db < backend/seed-data/mock_products.sql
-- Dimensions in cm; volume in m³ per unit (optional, can be derived from L×W×H).

INSERT INTO `products` (`product_name`, `unit_price`, `length`, `width`, `height`, `volume`) VALUES
('Rice 5kg bag', 120.00, 30, 20, 10, 0.006),
('Cooking oil 1L', 85.50, 8, 8, 25, 0.0016),
('Canned tomatoes 400g', 35.00, 8, 8, 12, 0.000768),
('Pasta 500g', 45.00, 25, 8, 4, 0.0008),
('Flour 1kg', 55.00, 22, 12, 8, 0.002112),
('Sugar 1kg', 42.00, 18, 10, 12, 0.00216),
('Milk 1L UHT', 38.00, 7, 7, 24, 0.001176),
('Water 6×1.5L', 65.00, 30, 25, 35, 0.02625),
('Egg tray 30 pcs', 95.00, 31, 25, 8, 0.0062),
('Frozen chicken 1kg', 145.00, 25, 18, 6, 0.0027),
('Yogurt 4×125g', 52.00, 12, 12, 10, 0.00144),
('Butter 200g', 68.00, 12, 6, 6, 0.000432),
('Juice 1L', 72.00, 8, 8, 30, 0.00192),
('Cereal 500g', 89.00, 25, 10, 30, 0.0075),
('Snack box 24 pcs', 180.00, 40, 30, 15, 0.018);
