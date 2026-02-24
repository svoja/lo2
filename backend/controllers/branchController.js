const db = require('../config/db');

// GET all branches (name and coords from location via JOIN; dc_name from DC's location)
exports.getAllBranches = (req, res) => {
    db.query(
        `SELECT b.branch_id, b.location_id, l.location_name AS branch_name, l.latitude, l.longitude, b.dc_id,
                l_dc.location_name AS dc_name
         FROM branch b
         JOIN location l ON b.location_id = l.location_id
         LEFT JOIN distribution d ON b.dc_id = d.dc_id
         LEFT JOIN location l_dc ON d.location_id = l_dc.location_id
         ORDER BY l.location_name`,
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json(result);
        }
    );
};

// GET branch by ID
exports.getBranchById = (req, res) => {
    db.query(
        `SELECT b.branch_id, b.location_id, l.location_name AS branch_name, l.latitude, l.longitude, b.dc_id,
                l_dc.location_name AS dc_name
         FROM branch b
         JOIN location l ON b.location_id = l.location_id
         LEFT JOIN distribution d ON b.dc_id = d.dc_id
         LEFT JOIN location l_dc ON d.location_id = l_dc.location_id
         WHERE b.branch_id = ?`,
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0)
                return res.status(404).json({ message: 'Branch not found' });
            res.json(result[0]);
        }
    );
};

// CREATE branch: body either { location_id, dc_id? } or { branch_name, latitude, longitude, dc_id? } (creates location then branch)
exports.createBranch = (req, res) => {
    const { location_id, branch_name, latitude, longitude, dc_id } = req.body;

    if (location_id != null && location_id !== '') {
        db.query(
            'INSERT INTO branch (location_id, dc_id) VALUES (?, ?)',
            [location_id, dc_id || null],
            (err, result) => {
                if (err) return res.status(500).json(err);
                res.status(201).json({ message: 'Branch created' });
            }
        );
        return;
    }

    db.query(
        'INSERT INTO location (location_name, latitude, longitude) VALUES (?, ?, ?)',
        [branch_name || null, latitude || null, longitude || null],
        (err, locResult) => {
            if (err) return res.status(500).json(err);
            const location_id_new = locResult.insertId;
            db.query(
                'INSERT INTO branch (location_id, dc_id) VALUES (?, ?)',
                [location_id_new, dc_id || null],
                (err2) => {
                    if (err2) return res.status(500).json(err2);
                    res.status(201).json({ message: 'Branch created' });
                }
            );
        }
    );
};

// UPDATE branch: body { branch_name?, latitude?, longitude?, dc_id? } — updates location by branch.location_id and branch.dc_id
exports.updateBranch = (req, res) => {
    const { branch_name, latitude, longitude, dc_id } = req.body;
    const branchId = req.params.id;

    db.query('SELECT location_id FROM branch WHERE branch_id = ?', [branchId], (err, rows) => {
        if (err) return res.status(500).json(err);
        if (rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
        const location_id = rows[0].location_id;

        const updates = [];
        const values = [];
        if (branch_name !== undefined) { updates.push('location_name = ?'); values.push(branch_name); }
        if (latitude !== undefined) { updates.push('latitude = ?'); values.push(latitude); }
        if (longitude !== undefined) { updates.push('longitude = ?'); values.push(longitude); }

        if (updates.length > 0) {
            values.push(location_id);
            db.query('UPDATE location SET ' + updates.join(', ') + ' WHERE location_id = ?', values, (err2) => {
                if (err2) return res.status(500).json(err2);
                if (dc_id !== undefined) {
                    db.query('UPDATE branch SET dc_id = ? WHERE branch_id = ?', [dc_id, branchId], (err3) => {
                        if (err3) return res.status(500).json(err3);
                        return res.json({ message: 'Branch updated' });
                    });
                } else {
                    return res.json({ message: 'Branch updated' });
                }
            });
        } else if (dc_id !== undefined) {
            db.query('UPDATE branch SET dc_id = ? WHERE branch_id = ?', [dc_id, branchId], (err3) => {
                if (err3) return res.status(500).json(err3);
                return res.json({ message: 'Branch updated' });
            });
        } else {
            res.json({ message: 'Branch updated' });
        }
    });
};

// DELETE branch — forbidden if used in orders or shipment (FK RESTRICT)
exports.deleteBranch = (req, res) => {
    const id = req.params.id;
    db.query(
        `SELECT (SELECT COUNT(*) FROM orders WHERE branch_id = ?) AS in_orders,
                (SELECT COUNT(*) FROM shipment WHERE origin_branch_id = ? OR destination_branch_id = ?) AS in_shipments`,
        [id, id, id],
        (err, rows) => {
            if (err) return res.status(500).json(err);
            const inOrders = (rows[0] && Number(rows[0].in_orders)) || 0;
            const inShipments = (rows[0] && Number(rows[0].in_shipments)) || 0;
            if (inOrders > 0 || inShipments > 0) {
                const parts = [];
                if (inOrders > 0) parts.push('orders');
                if (inShipments > 0) parts.push('shipments');
                return res.status(409).json({
                    message: `Cannot delete: this branch is used in ${parts.join(' and ')}. Remove or change those first.`,
                });
            }
            db.query('DELETE FROM branch WHERE branch_id = ?', [id], (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({ message: 'Branch deleted' });
            });
        }
    );
};
