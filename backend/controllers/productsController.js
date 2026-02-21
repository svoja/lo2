const db = require('../config/db');

exports.getAllProducts = (req, res) => {
  db.query('SELECT product_id, product_name, unit_price, length, width, height, volume FROM products ORDER BY product_id', (err, result) => {
    if (err) return res.status(500).json({ message: err.message, code: err.code });
    res.json(result);
  });
};
