const db = require('../config/db');

// GET all orders
exports.getAllOrders = (req, res) => {
    const sql = `
        SELECT
            o.order_id,
            o.order_date,
            b.branch_name,
            s.shipment_id,
            o.status,
            o.total_amount
        FROM orders o
        JOIN branch b ON o.branch_id = b.branch_id
        LEFT JOIN shipment s ON o.shipment_id = s.shipment_id
        ORDER BY o.order_date DESC
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};

// CREATE order
exports.createOrder = async (req, res) => {
    const { branch_id, products } = req.body;
    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // 1️⃣ ตรวจสอบ branch
        const [branch] = await conn.query(
            `SELECT branch_id FROM branch WHERE branch_id = ?`,
            [branch_id]
        );

        if (branch.length === 0) {
            await conn.rollback();
            return res.status(400).json({ message: "Invalid branch_id" });
        }

        let totalAmount = 0;
        let totalVolume = 0;

        const BOX_VOLUME = 0.036; // m3 ต่อกล่อง

        // 2️⃣ คำนวณจาก products จริง
        for (let p of products) {

            const [productData] = await conn.query(
                `SELECT unit_price, length, width, height
                 FROM products
                 WHERE product_id = ?`,
                [p.product_id]
            );

            if (productData.length === 0) {
                await conn.rollback();
                return res.status(400).json({ message: "Invalid product_id" });
            }

            const product = productData[0];

            // 💰 คำนวณเงิน
            const subtotal = product.unit_price * p.quantity;
            totalAmount += subtotal;

            // 📦 คำนวณ volume (cm → m)
            const volumePerUnit =
                (product.length / 100) *
                (product.width / 100) *
                (product.height / 100);

            totalVolume += volumePerUnit * p.quantity;
        }

        // 3️⃣ คำนวณจำนวนกล่อง
        const boxCount = Math.ceil(totalVolume / BOX_VOLUME);

        // 4️⃣ Insert Order
        const [orderResult] = await conn.query(
            `INSERT INTO orders
            (branch_id, order_date, status, total_amount, total_volume, box_count)
            VALUES (?, CURDATE(), 'Pending', ?, ?, ?)`,
            [branch_id, totalAmount, totalVolume, boxCount]
        );

        const order_id = orderResult.insertId;

        // 5️⃣ Insert Order Details
        for (let p of products) {
            await conn.query(
                `INSERT INTO order_details
                (order_id, product_id, quantity, production_date)
                VALUES (?, ?, ?, NOW())`,
                [order_id, p.product_id, p.quantity]
            );
        }

        await conn.commit();

        res.json({
            message: "Order created successfully",
            order_id,
            totalAmount,
            totalVolume,
            boxCount
        });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};

// GET order by ID
exports.getOrderById = async (req, res) => {
    const { id } = req.params;

    try {
        // 1️⃣ ดึงข้อมูล Order หลัก
        const [orderRows] = await db.promise().query(`
            SELECT 
                o.order_id,
                o.order_date,
                o.status,
                o.total_amount,
                b.branch_name,
                s.shipment_id
            FROM orders o
            JOIN branch b ON o.branch_id = b.branch_id
            LEFT JOIN shipment s ON o.shipment_id = s.shipment_id
            WHERE o.order_id = ?
        `, [id]);

        if (orderRows.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 2️⃣ ดึงรายการสินค้า
        const [detailRows] = await db.promise().query(`
            SELECT 
                od.detail_id,
                p.product_name,
                od.quantity,
                od.production_date
            FROM order_details od
            JOIN products p ON od.product_id = p.product_id
            WHERE od.order_id = ?
        `, [id]);

        res.json({
            order: orderRows[0],
            items: detailRows
        });

    } catch (err) {
        res.status(500).json(err);
    }
};

// DELETE order
exports.deleteOrder = async (req, res) => {
    const { id } = req.params;

    try {
        // เช็คก่อนว่ามี order ไหม
        const [order] = await db.promise().query(
            `SELECT * FROM orders WHERE order_id = ?`,
            [id]
        );

        if (order.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        // 1️⃣ ลบ order_details ก่อน
        await db.promise().query(
            `DELETE FROM order_details WHERE order_id = ?`,
            [id]
        );

        // 2️⃣ ลบ order
        await db.promise().query(
            `DELETE FROM orders WHERE order_id = ?`,
            [id]
        );

        res.json({ message: "Order deleted successfully" });

    } catch (err) {
        res.status(500).json(err);
    }
};

// UPDATE order
exports.updateOrder = async (req, res) => {
    const { id } = req.params;
    const { status, shipment_id } = req.body;

    try {
        // เช็คว่า order มีอยู่ไหม
        const [order] = await db.promise().query(
            `SELECT * FROM orders WHERE order_id = ?`,
            [id]
        );

        if (order.length === 0) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Validate status value
        const validStatus = ['Pending', 'In Transit', 'Delivered'];
        if (status && !validStatus.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        await db.promise().query(
            `UPDATE orders
             SET status = ?, shipment_id = ?
             WHERE order_id = ?`,
            [status || 'Pending', shipment_id || null, id]
        );

        res.json({ message: "Order updated successfully" });

    } catch (err) {
        res.status(500).json(err);
    }
};

// UPDATE order items
exports.updateOrderItems = async (req, res) => {
    const { id } = req.params;
    const { products } = req.body;
    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // เช็ค order
        const [order] = await conn.query(
            `SELECT * FROM orders WHERE order_id = ?`,
            [id]
        );

        if (order.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Order not found" });
        }

        // ลบรายการเก่า
        await conn.query(
            `DELETE FROM order_details WHERE order_id = ?`,
            [id]
        );

        let total = 0;

        for (let p of products) {

            // ดึง unit_price จาก products
            const [productData] = await conn.query(
                `SELECT unit_price FROM products WHERE product_id = ?`,
                [p.product_id]
            );

            if (productData.length === 0) {
                await conn.rollback();
                return res.status(400).json({ message: "Invalid product_id" });
            }

            const price = productData[0].unit_price;
            const subtotal = price * p.quantity;
            total += subtotal;

            await conn.query(
                `INSERT INTO order_details
                 (order_id, product_id, quantity, production_date)
                 VALUES (?, ?, ?, NOW())`,
                [id, p.product_id, p.quantity]
            );
        }

        // อัปเดต total_amount
        await conn.query(
            `UPDATE orders SET total_amount = ? WHERE order_id = ?`,
            [total, id]
        );

        await conn.commit();

        res.json({ message: "Order items updated successfully" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};
