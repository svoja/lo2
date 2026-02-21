const db = require('../config/db');

// GET all shipments (with total_volume, cartons, truck_capacity, utilization_percent)
exports.getAllShipments = (req, res) => {
    const sql = `
        SELECT 
            s.shipment_id,
            b1.branch_name AS origin_branch,
            b2.branch_name AS destination_branch,
            t.plate_number AS truck_plate,
            s.status,
            s.departure_time,
            s.total_volume,
            (SELECT COALESCE(SUM(o.box_count), 0) FROM shipment_orders so JOIN orders o ON so.order_id = o.order_id WHERE so.shipment_id = s.shipment_id) AS cartons,
            t.capacity_m3 AS truck_capacity,
            CASE WHEN t.truck_id IS NOT NULL AND t.capacity_m3 > 0
                 THEN ROUND((s.total_volume / t.capacity_m3) * 100, 2)
                 ELSE NULL END AS utilization_percent
        FROM shipment s
        JOIN branch b1 ON s.origin_branch_id = b1.branch_id
        JOIN branch b2 ON s.destination_branch_id = b2.branch_id
        LEFT JOIN truck t ON s.truck_id = t.truck_id
        ORDER BY s.departure_time DESC
    `;

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// GET shipment by ID (with total_volume, cartons, truck_capacity, utilization_percent, orders)
exports.getShipmentById = async (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT 
            s.shipment_id,
            b1.branch_name AS origin_branch,
            b2.branch_name AS destination_branch,
            t.plate_number AS truck_plate,
            s.status,
            s.departure_time,
            s.total_volume,
            (SELECT COALESCE(SUM(o.box_count), 0) FROM shipment_orders so JOIN orders o ON so.order_id = o.order_id WHERE so.shipment_id = s.shipment_id) AS cartons,
            t.capacity_m3 AS truck_capacity,
            CASE WHEN t.truck_id IS NOT NULL AND t.capacity_m3 > 0
                 THEN ROUND((s.total_volume / t.capacity_m3) * 100, 2)
                 ELSE NULL END AS utilization_percent
        FROM shipment s
        JOIN branch b1 ON s.origin_branch_id = b1.branch_id
        JOIN branch b2 ON s.destination_branch_id = b2.branch_id
        LEFT JOIN truck t ON s.truck_id = t.truck_id
        WHERE s.shipment_id = ?
    `;

    try {
        const [rows] = await db.promise().query(sql, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }
        const shipment = rows[0];

        const [orders] = await db.promise().query(`
            SELECT o.order_id, o.order_date, o.status, o.total_amount, o.total_volume, o.box_count
            FROM shipment_orders so
            JOIN orders o ON so.order_id = o.order_id
            WHERE so.shipment_id = ?
            ORDER BY o.order_date DESC
        `, [id]);
        shipment.orders = orders;
        res.json(shipment);
    } catch (err) {
        res.status(500).json({ message: err.message, code: err.code });
    }
};

// GET orders in shipment
exports.getShipmentOrders = async (req, res) => {
    const id = req.params.id;
    try {
        const [orders] = await db.promise().query(`
            SELECT o.order_id, o.order_date, o.status, o.total_amount, o.total_volume, o.box_count
            FROM shipment_orders so
            JOIN orders o ON so.order_id = o.order_id
            WHERE so.shipment_id = ?
            ORDER BY o.order_date DESC
        `, [id]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message, code: err.code });
    }
};

// CREATE shipment
exports.createShipment = (req, res) => {
    const { origin_branch_id, destination_branch_id, truck_id } = req.body;

    const sql = `
        INSERT INTO shipment 
        (origin_branch_id, destination_branch_id, truck_id) 
        VALUES (?, ?, ?)
    `;

    db.query(sql, [origin_branch_id, destination_branch_id, truck_id], 
    (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Shipment created' });
    });
};

// UPDATE shipment
exports.updateShipment = (req, res) => {
    const { status } = req.body;

    db.query(
        'UPDATE shipment SET status=? WHERE shipment_id=?',
        [status, req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Updated' });
        }
    );
};

// DELETE shipment
exports.deleteShipment = (req, res) => {
    db.query(
        'DELETE FROM shipment WHERE shipment_id=?',
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Deleted' });
        }
    );
};

// ASSIGN truck to shipment
exports.assignTruck = async (req, res) => {
    const { shipment_id } = req.params;
    const { truck_id } = req.body;

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // 1️⃣ ดึง shipment volume
        const [shipment] = await conn.query(
            `SELECT total_volume FROM shipment WHERE shipment_id = ?`,
            [shipment_id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        const shipmentVolume = shipment[0].total_volume;

        // 2️⃣ ดึง truck
        const [truck] = await conn.query(
            `SELECT capacity_m3, status FROM truck WHERE truck_id = ?`,
            [truck_id]
        );

        if (truck.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Truck not found" });
        }

        if (truck[0].status !== 'available') {
            await conn.rollback();
            return res.status(400).json({ message: "Truck not available" });
        }

        const truckCapacity = truck[0].capacity_m3;

        // 3️⃣ เช็ค capacity
        if (shipmentVolume > truckCapacity) {
            await conn.rollback();
            return res.status(400).json({
                message: "Truck capacity exceeded",
                shipmentVolume,
                truckCapacity
            });
        }

        // 4️⃣ Assign truck ให้ shipment
        await conn.query(
            `UPDATE shipment
             SET truck_id = ?
             WHERE shipment_id = ?`,
            [truck_id, shipment_id]
        );

        // 5️⃣ เปลี่ยนสถานะ truck เป็น busy
        await conn.query(
            `UPDATE truck
             SET status = 'busy'
             WHERE truck_id = ?`,
            [truck_id]
        );

        await conn.commit();

        res.json({
            message: "Truck assigned and set to busy",
            shipmentVolume,
            truckCapacity
        });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};

// START shipment
exports.startShipment = async (req, res) => {
    const { id } = req.params;

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // 1️⃣ ตรวจ shipment
        const [shipment] = await conn.query(
            `SELECT truck_id, status 
             FROM shipment 
             WHERE shipment_id = ?`,
            [id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        const currentStatus = shipment[0].status;
        const truckId = shipment[0].truck_id;

        if (!truckId) {
            await conn.rollback();
            return res.status(400).json({
                message: "No truck assigned"
            });
        }

        const allowedToStart = ['pending', 'Preparing'];
        if (!allowedToStart.includes(currentStatus)) {
            await conn.rollback();
            return res.status(400).json({
                message: "Shipment cannot start (must be Draft/Preparing)"
            });
        }

        // 2️⃣ Update status เป็น In Transit
        await conn.query(
            `UPDATE shipment
             SET status = 'In Transit',
                 departure_time = NOW()
             WHERE shipment_id = ?`,
            [id]
        );

        // 3️⃣ อัปเดต status ของ orders ใน shipment เป็น In Transit (ให้หน้า Order แสดงถูก)
        await conn.query(
            `UPDATE orders o
             INNER JOIN shipment_orders so ON o.order_id = so.order_id AND so.shipment_id = ?
             SET o.status = 'In Transit'`,
            [id]
        );

        await conn.commit();

        res.json({
            message: "Shipment started",
            status: "In Transit"
        });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};

// COMPLETE shipment
exports.completeShipment = async (req, res) => {
    const { id } = req.params;

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // 1️⃣ ตรวจ shipment
        const [shipment] = await conn.query(
            `SELECT truck_id, status 
             FROM shipment 
             WHERE shipment_id = ?`,
            [id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        const truckId = shipment[0].truck_id;
        const currentStatus = shipment[0].status;

        if (!truckId) {
            await conn.rollback();
            return res.status(400).json({
                message: "No truck assigned"
            });
        }

        if (currentStatus !== 'In Transit') {
            await conn.rollback();
            return res.status(400).json({
                message: "Shipment is not in transit"
            });
        }

        // 🔥 2️⃣ เช็คว่ามี order ใน shipment ไหม
        const [orders] = await conn.query(
            `SELECT COUNT(*) AS total 
             FROM shipment_orders 
             WHERE shipment_id = ?`,
            [id]
        );

        if (orders[0].total === 0) {
            await conn.rollback();
            return res.status(400).json({
                message: "Cannot complete shipment without orders"
            });
        }

        // 3️⃣ Update shipment → Delivered
        await conn.query(
            `UPDATE shipment
             SET status = 'Delivered',
                 arrival_time = NOW()
             WHERE shipment_id = ?`,
            [id]
        );

        // 3b. อัปเดต status ของ orders ใน shipment เป็น Delivered (ให้หน้า Order แสดงถูก)
        await conn.query(
            `UPDATE orders o
             INNER JOIN shipment_orders so ON o.order_id = so.order_id AND so.shipment_id = ?
             SET o.status = 'Delivered'`,
            [id]
        );

        // 4️⃣ คืน truck เป็น available
        await conn.query(
            `UPDATE truck
             SET status = 'available'
             WHERE truck_id = ?`,
            [truckId]
        );

        await conn.commit();

        res.json({
            message: "Shipment completed successfully"
        });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};

// GET shipment capacity
exports.getShipmentCapacity = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.promise().query(`
            SELECT 
                s.shipment_id,
                t.plate_number,
                s.total_volume,
                t.capacity_m3,
                ROUND((s.total_volume / t.capacity_m3) * 100, 2) AS usage_percent
            FROM shipment s
            JOIN truck t ON s.truck_id = t.truck_id
            WHERE s.shipment_id = ?
        `, [id]);

        if (result.length === 0) {
            return res.status(404).json({ message: "Shipment not found" });
        }

        res.json(result[0]);

    } catch (err) {
        res.status(500).json(err);
    }
};

// AUTO-ASSIGN truck
exports.autoAssignTruck = async (req, res) => {
    const { id } = req.params;

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // 1️⃣ ดึง shipment volume
        const [shipment] = await conn.query(
            `SELECT total_volume 
             FROM shipment 
             WHERE shipment_id = ?`,
            [id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        const volume = shipment[0].total_volume;

        // 2️⃣ หา truck ที่เล็กที่สุดแต่พอใส่ได้
        const [truck] = await conn.query(
            `SELECT truck_id, capacity_m3
             FROM truck
             WHERE status = 'available'
             AND capacity_m3 >= ?
             ORDER BY capacity_m3 ASC
             LIMIT 1`,
            [volume]
        );

        if (truck.length === 0) {
            await conn.rollback();
            return res.status(400).json({
                message: "No suitable truck available"
            });
        }

        const selectedTruck = truck[0];

        // 3️⃣ Assign
        await conn.query(
            `UPDATE shipment
             SET truck_id = ?
             WHERE shipment_id = ?`,
            [selectedTruck.truck_id, id]
        );

        await conn.query(
            `UPDATE truck
             SET status = 'busy'
             WHERE truck_id = ?`,
            [selectedTruck.truck_id]
        );

        await conn.commit();

        res.json({
            message: "Truck auto-assigned",
            truck: selectedTruck
        });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};

// ADD orders to shipment
exports.addOrdersToShipment = async (req, res) => {
    const { shipment_id } = req.params;
    const { order_ids } = req.body;

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        let shipmentVolume = 0;

        // ดึง volume เดิมของ shipment
        const [shipment] = await conn.query(
            `SELECT total_volume FROM shipment WHERE shipment_id = ?`,
            [shipment_id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        shipmentVolume = Number(shipment[0].total_volume) || 0;

        for (let order_id of order_ids) {

            const [order] = await conn.query(
                `SELECT total_volume FROM orders WHERE order_id = ?`,
                [order_id]
            );

            if (order.length === 0) continue;

            shipmentVolume += Number(order[0].total_volume) || 0;

            await conn.query(
                `INSERT INTO shipment_orders (shipment_id, order_id)
                 VALUES (?, ?)`,
                [shipment_id, order_id]
            );
            await conn.query(
                `UPDATE orders SET shipment_id = ? WHERE order_id = ?`,
                [shipment_id, order_id]
            );
        }

        // update shipment volume (ensure number for DECIMAL column)
        await conn.query(
            `UPDATE shipment SET total_volume = ? WHERE shipment_id = ?`,
            [Number(shipmentVolume), shipment_id]
        );

        await conn.commit();

        res.json({ message: "Orders added to shipment" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json(err);
    }
};
