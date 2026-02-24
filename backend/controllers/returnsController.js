const db = require('../config/db');

// GET all returns (with branch_name and dc_name from linked order)
exports.getAllReturns = async (req, res) => {
  try {
    const [rows] = await db.promise().query(`
      SELECT r.return_id, r.return_date, r.status,
             r.total_volume, r.order_id, r.shipment_id,
             l.location_name AS branch_name,
             l_dc.location_name AS dc_name
      FROM \`returns\` r
      LEFT JOIN orders o ON r.order_id = o.order_id
      LEFT JOIN branch b ON o.branch_id = b.branch_id
      LEFT JOIN location l ON b.location_id = l.location_id
      LEFT JOIN distribution d ON b.dc_id = d.dc_id
      LEFT JOIN location l_dc ON d.location_id = l_dc.location_id
      ORDER BY r.return_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message, code: err.code });
  }
};

// GET return by ID (with linked order information)
exports.getReturnById = async (req, res) => {
  const { id } = req.params;

  try {
    const [head] = await db.promise().query(
      `SELECT * FROM \`returns\` WHERE return_id = ?`,
      [id]
    );
    if (head.length === 0)
      return res.status(404).json({ message: 'Return not found' });

    const ret = head[0];
    const order_id = ret.order_id;

    const [items] = await db.promise().query(`
      SELECT rd.return_detail_id, rd.product_id, rd.quantity, rd.reason,
             p.product_name, p.volume
      FROM return_details rd
      JOIN products p ON rd.product_id = p.product_id
      WHERE rd.return_id = ?
    `, [id]);

    let order = null;
    let orderItems = [];

    if (order_id) {
      const [orderRows] = await db.promise().query(`
        SELECT o.order_id, o.order_date, o.status, o.total_amount, o.total_volume, o.box_count,
               l.location_name AS branch_name, l_dc.location_name AS dc_name, o.shipment_id
        FROM orders o
        JOIN branch b ON o.branch_id = b.branch_id
        JOIN location l ON b.location_id = l.location_id
        LEFT JOIN distribution d ON b.dc_id = d.dc_id
        LEFT JOIN location l_dc ON d.location_id = l_dc.location_id
        WHERE o.order_id = ?
      `, [order_id]);
      if (orderRows.length > 0) order = orderRows[0];

      const [detailRows] = await db.promise().query(`
        SELECT od.detail_id, p.product_name, od.quantity, od.production_date
        FROM order_details od
        JOIN products p ON od.product_id = p.product_id
        WHERE od.order_id = ?
      `, [order_id]);
      orderItems = detailRows;
    }

    res.json({ return: ret, items, order, orderItems });

  } catch (err) {
    res.status(500).json(err);
  }
};

// CREATE return
exports.createReturn = async (req, res) => {
  const { order_id, shipment_id, items } = req.body;
  const conn = db.promise();

  try {
    await conn.beginTransaction();

    // เช็ค order
    const [order] = await conn.query(
      `SELECT order_id FROM orders WHERE order_id = ?`,
      [order_id]
    );
    if (order.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    // สร้างหัว return
    const [ret] = await conn.query(
      `INSERT INTO \`returns\` (order_id, shipment_id, status)
       VALUES (?, ?, 'Pending')`,
      [order_id, shipment_id || null]
    );
    const return_id = ret.insertId;

    let totalVolume = 0;

    for (const it of items) {
      // ดึง volume จาก products
      const [p] = await conn.query(
        `SELECT volume FROM products WHERE product_id = ?`,
        [it.product_id]
      );
      if (p.length === 0) {
        await conn.rollback();
        return res.status(400).json({ message: 'Invalid product_id' });
      }

      const vol = Number(p[0].volume) * Number(it.quantity);
      totalVolume += vol;

      await conn.query(
        `INSERT INTO return_details
         (return_id, product_id, quantity, reason)
         VALUES (?, ?, ?, ?)`,
        [return_id, it.product_id, it.quantity, it.reason || null]
      );
    }

    await conn.query(
      `UPDATE \`returns\` SET total_volume = ? WHERE return_id = ?`,
      [totalVolume, return_id]
    );

    await conn.commit();
    res.json({ message: 'Return created', return_id });

  } catch (err) {
    await conn.rollback();
    res.status(500).json(err);
  }
};

// UPDATE return
exports.updateReturn = async (req, res) => {
  const { id } = req.params;
  const { shipment_id, status, items } = req.body;

  const conn = db.promise();

  try {
    await conn.beginTransaction();

    const [exists] = await conn.query(
      `SELECT * FROM \`returns\` WHERE return_id = ?`,
      [id]
    );
    if (exists.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Return not found' });
    }

    // ลบของเก่า
    await conn.query(
      `DELETE FROM return_details WHERE return_id = ?`,
      [id]
    );

    let totalVolume = 0;

    for (const it of items) {
      const [p] = await conn.query(
        `SELECT volume FROM products WHERE product_id = ?`,
        [it.product_id]
      );
      if (p.length === 0) {
        await conn.rollback();
        return res.status(400).json({ message: 'Invalid product_id' });
      }

      const vol = Number(p[0].volume) * Number(it.quantity);
      totalVolume += vol;

      await conn.query(
        `INSERT INTO return_details
         (return_id, product_id, quantity, reason)
         VALUES (?, ?, ?, ?)`,
        [id, it.product_id, it.quantity, it.reason || null]
      );
    }

    await conn.query(
      `UPDATE \`returns\`
       SET shipment_id = ?, status = ?, total_volume = ?
       WHERE return_id = ?`,
      [shipment_id || null, status || 'Pending', totalVolume, id]
    );

    await conn.commit();
    res.json({ message: 'Return updated' });

  } catch (err) {
    await conn.rollback();
    res.status(500).json(err);
  }
};

// DELETE return
exports.deleteReturn = async (req, res) => {
  const { id } = req.params;

  try {
    const [exists] = await db.promise().query(
      `SELECT * FROM \`returns\` WHERE return_id = ?`,
      [id]
    );
    if (exists.length === 0)
      return res.status(404).json({ message: 'Return not found' });

    await db.promise().query(
      `DELETE FROM \`returns\` WHERE return_id = ?`,
      [id]
    );

    res.json({ message: 'Return deleted' });

  } catch (err) {
    res.status(500).json(err);
  }
};
