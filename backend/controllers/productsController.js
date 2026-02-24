const db = require('../config/db');

exports.getAllProducts = (req, res) => {
  db.query('SELECT product_id, product_name, unit_price, length, width, height, volume FROM products ORDER BY product_id', (err, result) => {
    if (err) return res.status(500).json({ message: err.message, code: err.code });
    res.json(result);
  });
};

exports.getProductById = (req, res) => {
  const { id } = req.params;
  db.query('SELECT product_id, product_name, unit_price, length, width, height, volume FROM products WHERE product_id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message, code: err.code });
    if (!result || result.length === 0) return res.status(404).json({ message: 'Product not found' });
    res.json(result[0]);
  });
};

exports.createProduct = (req, res) => {
  const { product_name, unit_price, length, width, height, volume } = req.body;
  if (!product_name || unit_price == null) return res.status(400).json({ message: 'product_name and unit_price required' });
  const sql = 'INSERT INTO products (product_name, unit_price, length, width, height, volume) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [
    product_name.trim(),
    Number(unit_price),
    length != null ? Number(length) : null,
    width != null ? Number(width) : null,
    height != null ? Number(height) : null,
    volume != null ? Number(volume) : null,
  ], (err, result) => {
    if (err) return res.status(500).json({ message: err.message, code: err.code });
    res.status(201).json({ message: 'Product created', product_id: result.insertId });
  });
};

exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { product_name, unit_price, length, width, height, volume } = req.body;
  const sql = `UPDATE products SET product_name = ?, unit_price = ?, length = ?, width = ?, height = ?, volume = ?
               WHERE product_id = ?`;
  db.query(sql, [
    product_name != null && product_name !== '' ? String(product_name).trim() : null,
    unit_price != null && unit_price !== '' ? Number(unit_price) : 0,
    length != null && length !== '' ? Number(length) : null,
    width != null && width !== '' ? Number(width) : null,
    height != null && height !== '' ? Number(height) : null,
    volume != null && volume !== '' ? Number(volume) : null,
    id,
  ], (err, result) => {
    if (err) return res.status(500).json({ message: err.message, code: err.code });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product updated' });
  });
};

// DELETE product — forbidden if used in order_details or return_details (FK RESTRICT)
exports.deleteProduct = (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT (SELECT COUNT(*) FROM order_details WHERE product_id = ?) AS in_orders,
            (SELECT COUNT(*) FROM return_details WHERE product_id = ?) AS in_returns`,
    [id, id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message, code: err.code });
      const inOrders = (rows[0] && Number(rows[0].in_orders)) || 0;
      const inReturns = (rows[0] && Number(rows[0].in_returns)) || 0;
      if (inOrders > 0 || inReturns > 0) {
        const parts = [];
        if (inOrders > 0) parts.push('orders');
        if (inReturns > 0) parts.push('returns');
        return res.status(409).json({
          message: `Cannot delete: this product is used in ${parts.join(' and ')}. Remove or change those lines first.`,
        });
      }
      db.query('DELETE FROM products WHERE product_id = ?', [id], (err2, result) => {
        if (err2) return res.status(500).json({ message: err2.message, code: err2.code });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
      });
    }
  );
};
