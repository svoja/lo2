const db = require('../config/db');

// Legacy query when 2-Tier migration not run (no transport_layer, origin_type, manufacturer, truck_type)
const getAllShipmentsLegacySql = `
    SELECT 
        s.shipment_id,
        s.origin_branch_id,
        s.origin_dc_id,
        s.destination_branch_id,
        s.truck_id,
        COALESCE(l_dc.location_name, l1.location_name) AS origin_branch,
        CASE WHEN s.origin_dc_id IS NOT NULL THEN 1 ELSE 0 END AS origin_is_dc,
        0 AS origin_is_manufacturer,
        l2.location_name AS destination_branch,
        t.plate_number AS truck_plate,
        s.status,
        s.shipment_type,
        s.departure_time,
        s.arrival_time,
        s.total_volume,
        (SELECT COALESCE(SUM(o.box_count), 0) FROM shipment_orders so JOIN orders o ON so.order_id = o.order_id WHERE so.shipment_id = s.shipment_id) AS cartons,
        t.capacity_m3 AS truck_capacity,
        CASE WHEN t.truck_id IS NOT NULL AND t.capacity_m3 > 0
             THEN ROUND((s.total_volume / t.capacity_m3) * 100, 2)
             ELSE NULL END AS utilization_percent
    FROM shipment s
    LEFT JOIN distribution d_origin ON s.origin_dc_id = d_origin.dc_id
    LEFT JOIN location l_dc ON d_origin.location_id = l_dc.location_id
    LEFT JOIN branch b1 ON s.origin_branch_id = b1.branch_id
    LEFT JOIN location l1 ON b1.location_id = l1.location_id
    LEFT JOIN branch b2 ON s.destination_branch_id = b2.branch_id
    LEFT JOIN location l2 ON b2.location_id = l2.location_id
    LEFT JOIN truck t ON s.truck_id = t.truck_id
    ORDER BY s.departure_time DESC
`;

// GET all shipments (2-Tier: full query, or legacy if migration not run)
exports.getAllShipments = (req, res) => {
    const sql = `
        SELECT 
            s.shipment_id,
            s.transport_layer,
            s.origin_type,
            s.origin_id,
            s.origin_branch_id,
            s.origin_dc_id,
            s.destination_type,
            s.destination_id,
            s.destination_branch_id,
            s.truck_id,
            COALESCE(l_m.location_name, l_dc.location_name, l1.location_name) AS origin_branch,
            CASE WHEN s.origin_type = 'Manufacturer' OR (s.origin_type IS NULL AND s.origin_dc_id IS NOT NULL) THEN 0
                 WHEN s.origin_type = 'DC' OR s.origin_dc_id IS NOT NULL THEN 1 ELSE 0 END AS origin_is_dc,
            CASE WHEN s.origin_type = 'Manufacturer' THEN 1 ELSE 0 END AS origin_is_manufacturer,
            COALESCE(l2.location_name, l_dest.location_name) AS destination_branch,
            t.plate_number AS truck_plate,
            t.truck_type AS truck_type,
            s.status,
            s.shipment_type,
            s.departure_time,
            s.arrival_time,
            s.total_volume,
            (SELECT COALESCE(SUM(o.box_count), 0) FROM shipment_orders so JOIN orders o ON so.order_id = o.order_id WHERE so.shipment_id = s.shipment_id) AS cartons,
            t.capacity_m3 AS truck_capacity,
            CASE WHEN t.truck_id IS NOT NULL AND t.capacity_m3 > 0
                 THEN ROUND((s.total_volume / t.capacity_m3) * 100, 2)
                 ELSE NULL END AS utilization_percent
        FROM shipment s
        LEFT JOIN manufacturer m_orig ON s.origin_type = 'Manufacturer' AND s.origin_id = m_orig.manufacturer_id
        LEFT JOIN location l_m ON m_orig.location_id = l_m.location_id
        LEFT JOIN distribution d_origin ON (s.origin_type = 'DC' AND s.origin_id = d_origin.dc_id) OR s.origin_dc_id = d_origin.dc_id
        LEFT JOIN location l_dc ON d_origin.location_id = l_dc.location_id
        LEFT JOIN branch b1 ON (s.origin_type = 'Branch' AND s.origin_id = b1.branch_id) OR s.origin_branch_id = b1.branch_id
        LEFT JOIN location l1 ON b1.location_id = l1.location_id
        LEFT JOIN branch b2 ON (s.destination_type = 'Branch' AND s.destination_id = b2.branch_id) OR s.destination_branch_id = b2.branch_id
        LEFT JOIN location l2 ON b2.location_id = l2.location_id
        LEFT JOIN distribution d_dest ON s.destination_type = 'DC' AND s.destination_id = d_dest.dc_id
        LEFT JOIN location l_dest ON d_dest.location_id = l_dest.location_id
        LEFT JOIN truck t ON s.truck_id = t.truck_id
        ORDER BY s.departure_time DESC
    `;

    const conn = db.promise();
    conn.query(sql)
        .then(([result]) => res.json(result))
        .catch((err) => {
            const isUnknownColumn = err.code === 'ER_BAD_FIELD' || (err.message && err.message.includes('Unknown column'));
            if (isUnknownColumn) {
                return conn.query(getAllShipmentsLegacySql)
                    .then(([rows]) => {
                        const normalized = rows.map((r) => ({
                            ...r,
                            transport_layer: null,
                            origin_type: r.origin_dc_id ? 'DC' : (r.origin_branch_id ? 'Branch' : null),
                            origin_id: r.origin_dc_id || r.origin_branch_id || null,
                            destination_type: 'Branch',
                            destination_id: r.destination_branch_id,
                            truck_type: null,
                        }));
                        res.json(normalized);
                    })
                    .catch((legacyErr) => {
                        console.error('getAllShipments legacy SQL error:', legacyErr.message);
                        res.status(500).json({ message: legacyErr.message, code: legacyErr.code });
                    });
            }
            console.error('getAllShipments SQL error:', err.message);
            res.status(500).json({ message: err.message, code: err.code });
        });
};

// GET shipment by ID (2-Tier: origin/dest from type+id or legacy)
exports.getShipmentById = async (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT 
            s.shipment_id,
            s.transport_layer,
            s.origin_type,
            s.origin_id,
            s.origin_branch_id,
            s.origin_dc_id,
            s.destination_type,
            s.destination_id,
            COALESCE(l_m.location_name, l_dc.location_name, l1.location_name) AS origin_branch,
            CASE WHEN s.origin_type = 'DC' OR s.origin_dc_id IS NOT NULL THEN 1 ELSE 0 END AS origin_is_dc,
            CASE WHEN s.origin_type = 'Manufacturer' THEN 1 ELSE 0 END AS origin_is_manufacturer,
            COALESCE(l2.location_name, l_dest.location_name) AS destination_branch,
            t.plate_number AS truck_plate,
            t.truck_type AS truck_type,
            s.status,
            s.shipment_type,
            s.departure_time,
            s.arrival_time,
            s.total_volume,
            s.receipt_notes,
            s.receipt_damage,
            (SELECT COALESCE(SUM(o.box_count), 0) FROM shipment_orders so JOIN orders o ON so.order_id = o.order_id WHERE so.shipment_id = s.shipment_id) AS cartons,
            t.capacity_m3 AS truck_capacity,
            CASE WHEN t.truck_id IS NOT NULL AND t.capacity_m3 > 0
                 THEN ROUND((s.total_volume / t.capacity_m3) * 100, 2)
                 ELSE NULL END AS utilization_percent
        FROM shipment s
        LEFT JOIN manufacturer m_orig ON s.origin_type = 'Manufacturer' AND s.origin_id = m_orig.manufacturer_id
        LEFT JOIN location l_m ON m_orig.location_id = l_m.location_id
        LEFT JOIN distribution d_origin ON (s.origin_type = 'DC' AND s.origin_id = d_origin.dc_id) OR s.origin_dc_id = d_origin.dc_id
        LEFT JOIN location l_dc ON d_origin.location_id = l_dc.location_id
        LEFT JOIN branch b1 ON (s.origin_type = 'Branch' AND s.origin_id = b1.branch_id) OR s.origin_branch_id = b1.branch_id
        LEFT JOIN location l1 ON b1.location_id = l1.location_id
        LEFT JOIN branch b2 ON (s.destination_type = 'Branch' AND s.destination_id = b2.branch_id) OR s.destination_branch_id = b2.branch_id
        LEFT JOIN location l2 ON b2.location_id = l2.location_id
        LEFT JOIN distribution d_dest ON s.destination_type = 'DC' AND s.destination_id = d_dest.dc_id
        LEFT JOIN location l_dest ON d_dest.location_id = l_dest.location_id
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
            SELECT o.order_id, o.order_date, o.status, o.total_amount, o.total_volume, o.box_count,
                   l.location_name AS branch_name, l_dc.location_name AS dc_name
            FROM shipment_orders so
            JOIN orders o ON so.order_id = o.order_id
            JOIN branch b ON o.branch_id = b.branch_id
            JOIN location l ON b.location_id = l.location_id
            LEFT JOIN distribution d ON b.dc_id = d.dc_id
            LEFT JOIN location l_dc ON d.location_id = l_dc.location_id
            WHERE so.shipment_id = ?
            ORDER BY o.order_date DESC, o.order_id DESC
        `, [id]);
        shipment.orders = orders;

        const [returns] = await db.promise().query(`
            SELECT r.return_id, r.return_date, r.status, r.total_volume, r.order_id
            FROM \`returns\` r
            WHERE r.shipment_id = ?
            ORDER BY r.return_date DESC, r.return_id DESC
        `, [id]);
        shipment.returns = returns;

        const [availableReturns] = await db.promise().query(`
            SELECT r.return_id, r.return_date, r.status, r.total_volume, r.order_id
            FROM \`returns\` r
            INNER JOIN shipment_orders so ON so.order_id = r.order_id AND so.shipment_id = ?
            WHERE r.shipment_id IS NULL AND (r.status = 'Pending' OR r.status IS NULL OR TRIM(r.status) = '')
            ORDER BY r.return_date DESC, r.return_id DESC
        `, [id]);
        shipment.available_returns = availableReturns;

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
            ORDER BY o.order_date DESC, o.order_id DESC
        `, [id]);
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message, code: err.code });
    }
};

// GET shipment route stops (origin = DC or branch; destination = branch; ordered stops) for map polyline
exports.getShipmentRouteStops = async (req, res) => {
    const id = req.params.id;
    try {
        const [shipRows] = await db.promise().query(
            `SELECT s.shipment_id, s.origin_type, s.origin_id, s.origin_branch_id, s.origin_dc_id, s.destination_type, s.destination_id, s.destination_branch_id
             FROM shipment s WHERE s.shipment_id = ?`,
            [id]
        );
        if (shipRows.length === 0) {
            return res.status(404).json({ message: 'Shipment not found' });
        }
        const row = shipRows[0];
        const { origin_type, origin_id, origin_branch_id, origin_dc_id, destination_type, destination_id, destination_branch_id } = row;

        let origin = null;
        if (origin_type === 'Manufacturer' && origin_id != null) {
            const [mRows] = await db.promise().query(
                `SELECT m.manufacturer_id, l.location_name AS branch_name, l.latitude, l.longitude
                 FROM manufacturer m JOIN location l ON m.location_id = l.location_id WHERE m.manufacturer_id = ?`,
                [origin_id]
            );
            if (mRows[0]) {
                origin = { manufacturer_id: mRows[0].manufacturer_id, branch_name: mRows[0].branch_name, latitude: mRows[0].latitude, longitude: mRows[0].longitude };
            }
        }
        if (origin == null && (origin_type === 'DC' || origin_dc_id != null)) {
            const id = origin_type === 'DC' ? origin_id : origin_dc_id;
            const [dcRows] = await db.promise().query(
                `SELECT d.dc_id, l.location_name AS branch_name, l.latitude, l.longitude
                 FROM distribution d JOIN location l ON d.location_id = l.location_id WHERE d.dc_id = ?`,
                [id]
            );
            if (dcRows[0]) {
                origin = { dc_id: dcRows[0].dc_id, branch_name: dcRows[0].branch_name, latitude: dcRows[0].latitude, longitude: dcRows[0].longitude };
            }
        }
        if (origin == null && (origin_type === 'Branch' || origin_branch_id != null)) {
            const bid = origin_type === 'Branch' ? origin_id : origin_branch_id;
            const [originRows] = await db.promise().query(
                `SELECT b.branch_id, l.location_name AS branch_name, l.latitude, l.longitude
                 FROM branch b JOIN location l ON b.location_id = l.location_id WHERE b.branch_id = ?`,
                [bid]
            );
            if (originRows[0]) {
                origin = { branch_id: originRows[0].branch_id, branch_name: originRows[0].branch_name, latitude: originRows[0].latitude, longitude: originRows[0].longitude };
            }
        }

        let destination = null;
        const destId = destination_type === 'DC' ? destination_id : destination_branch_id;
        if (destination_type === 'DC' && destId != null) {
            const [dRows] = await db.promise().query(
                `SELECT d.dc_id, l.location_name AS branch_name, l.latitude, l.longitude
                 FROM distribution d JOIN location l ON d.location_id = l.location_id WHERE d.dc_id = ?`,
                [destId]
            );
            if (dRows[0]) destination = { dc_id: dRows[0].dc_id, branch_name: dRows[0].branch_name, latitude: dRows[0].latitude, longitude: dRows[0].longitude };
        }
        if (destination == null && destId != null) {
            const [destRows] = await db.promise().query(
                `SELECT b.branch_id, l.location_name AS branch_name, l.latitude, l.longitude
                 FROM branch b JOIN location l ON b.location_id = l.location_id WHERE b.branch_id = ?`,
                [destId]
            );
            if (destRows[0]) destination = { branch_id: destRows[0].branch_id, branch_name: destRows[0].branch_name, latitude: destRows[0].latitude, longitude: destRows[0].longitude };
        }

        const [stopRows] = await db.promise().query(
            `SELECT o.branch_id, l.location_name AS branch_name, l.latitude, l.longitude, so.order_id
             FROM shipment_orders so
             JOIN orders o ON so.order_id = o.order_id
             JOIN branch b ON o.branch_id = b.branch_id
             JOIN location l ON b.location_id = l.location_id
             WHERE so.shipment_id = ?
             ORDER BY so.order_id`,
            [id]
        );
        const stops = (stopRows || []).map((r, i) => ({
            branch_id: r.branch_id,
            branch_name: r.branch_name,
            latitude: r.latitude,
            longitude: r.longitude,
            sequence: i + 1,
        }));

        res.json({ origin, destination, stops });
    } catch (err) {
        res.status(500).json({ message: err.message, code: err.code });
    }
};

// CREATE shipment (ถ้าเลือก truck ไว้ จะ set truck เป็น busy เลย ไม่ต้อง assign อีกรอบ)
exports.createShipment = async (req, res) => {
    const { origin_branch_id, destination_branch_id, truck_id, shipment_type } = req.body;
    const conn = db.promise();

    try {
        const truckIdToUse = truck_id != null && truck_id !== '' ? Number(truck_id) : null;
        const type = shipment_type === 'Inbound' ? 'Inbound' : 'Outbound';

        if (truckIdToUse != null) {
            const [truck] = await conn.query(
                `SELECT status FROM truck WHERE truck_id = ?`,
                [truckIdToUse]
            );
            if (truck.length === 0) {
                return res.status(400).json({ message: "Truck not found" });
            }
            if (truck[0].status !== 'available') {
                return res.status(400).json({ message: "Truck not available" });
            }
        }

        await conn.query(
            `INSERT INTO shipment (origin_branch_id, destination_branch_id, truck_id, shipment_type)
             VALUES (?, ?, ?, ?)`,
            [origin_branch_id, destination_branch_id, truckIdToUse, type]
        );

        if (truckIdToUse != null) {
            await conn.query(
                `UPDATE truck SET status = 'busy' WHERE truck_id = ?`,
                [truckIdToUse]
            );
        }

        res.json({ message: 'Shipment created' });
    } catch (err) {
        res.status(500).json(err);
    }
};

// UPDATE shipment (status; optional origin_branch_id, destination_branch_id, truck_id when draft)
exports.updateShipment = (req, res) => {
    const { status, origin_branch_id, destination_branch_id, truck_id } = req.body;
    const id = req.params.id;

    db.query('SELECT status FROM shipment WHERE shipment_id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0) return res.status(404).json({ message: 'Shipment not found' });
        const current = (rows[0].status || '').toLowerCase().replace(/\s+/g, '_');
        const isDraft = current === 'pending' || current === 'preparing';

        const updates = [];
        const values = [];
        if (status !== undefined) { updates.push('status = ?'); values.push(status); }
        if (isDraft && origin_branch_id !== undefined) { updates.push('origin_branch_id = ?'); values.push(origin_branch_id); }
        if (isDraft && destination_branch_id !== undefined) { updates.push('destination_branch_id = ?'); values.push(destination_branch_id); }
        if (isDraft && truck_id !== undefined) { updates.push('truck_id = ?'); values.push(truck_id === '' || truck_id == null ? null : truck_id); }
        if (updates.length === 0) return res.json({ message: 'Updated' });

        values.push(id);
        db.query(
            'UPDATE shipment SET ' + updates.join(', ') + ' WHERE shipment_id = ?',
            values,
            (err2, result) => {
                if (err2) return res.status(500).json(err2);
                if (result.affectedRows === 0) return res.status(404).json({ message: 'Shipment not found' });
                res.json({ message: 'Updated' });
            }
        );
    });
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

        // 1b. ต้องมี order ถึงจะ Start ได้ (เช็คที่ขั้นแรก ไม่ใช่ตอน Complete)
        const [orderCount] = await conn.query(
            `SELECT COUNT(*) AS total FROM shipment_orders WHERE shipment_id = ?`,
            [id]
        );
        if (orderCount[0].total === 0) {
            await conn.rollback();
            return res.status(400).json({
                message: "Cannot start shipment without orders. Add at least one order first."
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

// COMPLETE shipment (optional return_ids: attach returns and mark Received when delivery done)
exports.completeShipment = async (req, res) => {
    const { id } = req.params;
    const return_ids = Array.isArray(req.body?.return_ids) ? req.body.return_ids.map((x) => Number(x)).filter(Boolean) : [];

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        // 1️⃣ ตรวจ shipment
        const [shipment] = await conn.query(
            `SELECT truck_id, status, shipment_type 
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
        const shipmentType = (shipment[0].shipment_type || '').trim();

        if (shipmentType === 'Inbound') {
            await conn.rollback();
            return res.status(400).json({
                message: "Use Receive shipment for inbound. Complete is for outbound only."
            });
        }

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

        // 2️⃣ (orders already required at Start, so we know there are orders here; keep check for safety)
        const [orders] = await conn.query(
            `SELECT COUNT(*) AS total FROM shipment_orders WHERE shipment_id = ?`,
            [id]
        );
        if (orders[0].total === 0) {
            await conn.rollback();
            return res.status(400).json({
                message: "Cannot complete shipment without orders"
            });
        }

        if (return_ids.length > 0) {
            const placeholders = return_ids.map(() => '?').join(',');
            await conn.query(
                `UPDATE \`returns\` r
                 INNER JOIN shipment_orders so ON so.order_id = r.order_id AND so.shipment_id = ?
                 SET r.shipment_id = ?, r.status = 'Received'
                 WHERE r.return_id IN (${placeholders}) AND r.shipment_id IS NULL`,
                [id, id, ...return_ids]
            );
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

// RECEIVE shipment (inbound only: optional receipt_notes, receipt_damage, return_ids to attach)
exports.receiveShipment = async (req, res) => {
    const { id } = req.params;
    const { receipt_notes, receipt_damage, return_ids: bodyReturnIds } = req.body || {};
    const return_ids = Array.isArray(bodyReturnIds) ? bodyReturnIds.map((x) => Number(x)).filter(Boolean) : [];

    const conn = db.promise();

    try {
        await conn.beginTransaction();

        const [shipment] = await conn.query(
            `SELECT truck_id, status, shipment_type FROM shipment WHERE shipment_id = ?`,
            [id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        const truckId = shipment[0].truck_id;
        const currentStatus = (shipment[0].status || '').trim();
        const shipmentType = (shipment[0].shipment_type || '').trim();

        if (shipmentType !== 'Inbound') {
            await conn.rollback();
            return res.status(400).json({
                message: "Receive is for inbound shipments only. Use Complete for outbound."
            });
        }

        if (currentStatus !== 'In Transit') {
            await conn.rollback();
            return res.status(400).json({
                message: "Shipment must be In Transit to receive."
            });
        }

        if (!truckId) {
            await conn.rollback();
            return res.status(400).json({ message: "No truck assigned" });
        }

        const [orderCount] = await conn.query(
            `SELECT COUNT(*) AS total FROM shipment_orders WHERE shipment_id = ?`,
            [id]
        );
        if (orderCount[0].total === 0) {
            await conn.rollback();
            return res.status(400).json({
                message: "Cannot receive shipment without orders"
            });
        }

        if (return_ids.length > 0) {
            const placeholders = return_ids.map(() => '?').join(',');
            await conn.query(
                `UPDATE \`returns\` r
                 INNER JOIN shipment_orders so ON so.order_id = r.order_id AND so.shipment_id = ?
                 SET r.shipment_id = ?, r.status = 'Received'
                 WHERE r.return_id IN (${placeholders}) AND r.shipment_id IS NULL`,
                [id, id, ...return_ids]
            );
        }

        await conn.query(
            `UPDATE shipment
             SET status = 'Received',
                 arrival_time = NOW(),
                 receipt_notes = ?,
                 receipt_damage = ?
             WHERE shipment_id = ?`,
            [receipt_notes != null ? String(receipt_notes).trim() || null : null, receipt_damage != null ? String(receipt_damage).trim() || null : null, id]
        );

        await conn.query(
            `UPDATE orders o
             INNER JOIN shipment_orders so ON o.order_id = so.order_id AND so.shipment_id = ?
             SET o.status = 'Received'`,
            [id]
        );

        await conn.query(
            `UPDATE truck SET status = 'available' WHERE truck_id = ?`,
            [truckId]
        );

        await conn.commit();

        res.json({
            message: "Shipment received successfully",
            status: "Received"
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

        // 1️⃣ ดึง shipment volume + transport_layer (for truck type filter)
        const [shipment] = await conn.query(
            `SELECT total_volume, COALESCE(transport_layer, 'LastMile') AS transport_layer
             FROM shipment
             WHERE shipment_id = ?`,
            [id]
        );

        if (shipment.length === 0) {
            await conn.rollback();
            return res.status(404).json({ message: "Shipment not found" });
        }

        const volume = shipment[0].total_volume;
        const layer = (shipment[0].transport_layer || 'LastMile').toString();

        // 2️⃣ หา truck ที่เล็กที่สุดแต่พอใส่ได้ + ตรงประเภท (Linehaul/LastMile)
        const [truck] = await conn.query(
            `SELECT truck_id, capacity_m3
             FROM truck
             WHERE status = 'available'
             AND (truck_type = ? OR truck_type IS NULL)
             AND capacity_m3 >= ?
             ORDER BY capacity_m3 ASC
             LIMIT 1`,
            [layer, volume]
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

// POST Linehaul: Manufacturer → DC (big truck, bulk). Body: { manufacturer_id, dc_id, truck_id?, total_volume? }
exports.createLinehaul = async (req, res) => {
    const { manufacturer_id, dc_id, truck_id: bodyTruckId, total_volume } = req.body;
    if (!manufacturer_id || !dc_id) {
        return res.status(400).json({ message: 'manufacturer_id and dc_id required' });
    }
    const conn = db.promise();
    try {
        let truckIdToUse = bodyTruckId != null && bodyTruckId !== '' ? Number(bodyTruckId) : null;
        if (truckIdToUse != null) {
            const [truck] = await conn.query(
                `SELECT truck_id, status, truck_type FROM truck WHERE truck_id = ?`,
                [truckIdToUse]
            );
            if (truck.length === 0) {
                return res.status(400).json({ message: 'Truck not found' });
            }
            if ((truck[0].status || '').toLowerCase() !== 'available') {
                return res.status(400).json({ message: 'Truck is not available' });
            }
            if ((truck[0].truck_type || '').toString() !== 'Linehaul') {
                return res.status(400).json({ message: 'Use a Linehaul truck for this shipment' });
            }
        }

        const vol = total_volume != null && total_volume !== '' ? Number(total_volume) : 0;
        const [insertResult] = await conn.query(
            `INSERT INTO shipment (
                transport_layer, origin_type, origin_id, origin_branch_id, origin_dc_id,
                destination_type, destination_id, destination_branch_id, truck_id, status, total_volume, shipment_type
            ) VALUES ('Linehaul', 'Manufacturer', ?, NULL, NULL, 'DC', ?, NULL, ?, 'pending', ?, 'Outbound')`,
            [manufacturer_id, dc_id, truckIdToUse, vol]
        );

        if (truckIdToUse != null) {
            await conn.query(`UPDATE truck SET status = 'busy' WHERE truck_id = ?`, [truckIdToUse]);
        }
        res.status(201).json({ message: 'Linehaul shipment created', shipment_id: insertResult.insertId });
    } catch (err) {
        res.status(500).json(err);
    }
};

const BOX_VOLUME = 0.036;

// POST create shipment with orders (route + dc + branches with items; optional truck_id)
exports.createWithOrders = async (req, res) => {
    const { route_id, dc_id, branches, truck_id: bodyTruckId } = req.body;
    const conn = db.promise();

    if (!route_id || !dc_id || !Array.isArray(branches) || branches.length === 0) {
        return res.status(400).json({ message: 'route_id, dc_id and non-empty branches required' });
    }

    let truckIdToUse = bodyTruckId != null && bodyTruckId !== '' ? Number(bodyTruckId) : null;
    if (truckIdToUse != null) {
        const [truck] = await conn.query(
            `SELECT truck_id, status FROM truck WHERE truck_id = ?`,
            [truckIdToUse]
        );
        if (truck.length === 0) {
            return res.status(400).json({ message: 'Truck not found' });
        }
        if ((truck[0].status || '').toLowerCase() !== 'available') {
            return res.status(400).json({ message: 'Truck is not available' });
        }
    }

    try {
        await conn.beginTransaction();

        const branchIds = branches.map((b) => b.branch_id).filter(Boolean);
        if (branchIds.length === 0) {
            await conn.rollback();
            return res.status(400).json({ message: 'At least one branch_id required' });
        }

        const destination_branch_id = branchIds[branchIds.length - 1];

        const [shipResult] = await conn.query(
            `INSERT INTO shipment (transport_layer, origin_type, origin_id, origin_dc_id, destination_type, destination_id, destination_branch_id, truck_id, status, total_volume, shipment_type)
             VALUES ('LastMile', 'DC', ?, ?, 'Branch', ?, ?, ?, 'pending', 0, 'Outbound')`,
            [dc_id, dc_id, destination_branch_id, destination_branch_id, truckIdToUse]
        );
        const shipment_id = shipResult.insertId;
        let shipmentTotalVolume = 0;

        for (const branch of branches) {
            const branch_id = branch.branch_id;
            const items = branch.items || [];
            if (items.length === 0) continue;

            let totalAmount = 0;
            let totalVolume = 0;

            for (const item of items) {
                const [productData] = await conn.query(
                    `SELECT unit_price, length, width, height, volume FROM products WHERE product_id = ?`,
                    [item.product_id]
                );
                if (productData.length === 0) {
                    await conn.rollback();
                    return res.status(400).json({ message: `Invalid product_id: ${item.product_id}` });
                }
                const p = productData[0];
                const qty = Number(item.quantity) || 0;
                totalAmount += Number(p.unit_price) * qty;
                let volPerUnit;
                if (p.volume != null && Number(p.volume) > 0) {
                    volPerUnit = Number(p.volume);
                } else if (p.length != null && p.width != null && p.height != null) {
                    volPerUnit = (Number(p.length) / 100) * (Number(p.width) / 100) * (Number(p.height) / 100);
                } else {
                    volPerUnit = 0;
                }
                totalVolume += volPerUnit * qty;
            }

            const boxCount = Math.ceil(totalVolume / BOX_VOLUME);

            const [orderResult] = await conn.query(
                `INSERT INTO orders (branch_id, order_date, shipment_id, status, total_amount, total_volume, box_count)
                 VALUES (?, CURDATE(), ?, 'Pending', ?, ?, ?)`,
                [branch_id, shipment_id, totalAmount, totalVolume, boxCount]
            );
            const order_id = orderResult.insertId;

            for (const item of items) {
                await conn.query(
                    `INSERT INTO order_details (order_id, product_id, quantity, production_date)
                     VALUES (?, ?, ?, NOW())`,
                    [order_id, item.product_id, item.quantity]
                );
            }

            await conn.query(
                `INSERT INTO shipment_orders (shipment_id, order_id) VALUES (?, ?)`,
                [shipment_id, order_id]
            );

            shipmentTotalVolume += Number(totalVolume);
        }

        await conn.query(
            `UPDATE shipment SET total_volume = ? WHERE shipment_id = ?`,
            [Number(shipmentTotalVolume), shipment_id]
        );

        if (truckIdToUse != null) {
            await conn.query(
                `UPDATE truck SET status = 'busy' WHERE truck_id = ?`,
                [truckIdToUse]
            );
            // Auto-start shipment: In Transit + departure_time, and orders In Transit
            await conn.query(
                `UPDATE shipment
                 SET status = 'In Transit', departure_time = NOW()
                 WHERE shipment_id = ?`,
                [shipment_id]
            );
            await conn.query(
                `UPDATE orders o
                 INNER JOIN shipment_orders so ON o.order_id = so.order_id AND so.shipment_id = ?
                 SET o.status = 'In Transit'`,
                [shipment_id]
            );
        }

        await conn.commit();

        res.status(201).json({
            message: truckIdToUse != null ? 'Shipment created with orders and started' : 'Shipment created with orders',
            shipment_id
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message, code: err.code });
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
