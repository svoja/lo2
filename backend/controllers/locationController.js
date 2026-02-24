const db = require('../config/db');

// GET all locations (with used_by: branch_id and dc_id if this location is used as branch or DC)
exports.getAllLocations = (req, res) => {
    db.query(
        `SELECT l.location_id, l.location_name, l.latitude, l.longitude, l.address,
                (SELECT branch_id FROM branch WHERE location_id = l.location_id LIMIT 1) AS branch_id,
                (SELECT dc_id FROM distribution WHERE location_id = l.location_id LIMIT 1) AS dc_id
         FROM location l
         ORDER BY l.location_name`,
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json(result);
        }
    );
};

// GET location by ID (with branch_id, dc_id if used)
exports.getLocationById = (req, res) => {
    db.query(
        `SELECT l.location_id, l.location_name, l.latitude, l.longitude, l.address,
                b.branch_id, d.dc_id
         FROM location l
         LEFT JOIN branch b ON b.location_id = l.location_id
         LEFT JOIN distribution d ON d.location_id = l.location_id
         WHERE l.location_id = ?`,
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0)
                return res.status(404).json({ message: 'Location not found' });
            const merged = result.reduce((acc, r) => ({
                ...acc,
                branch_id: acc.branch_id || r.branch_id || null,
                dc_id: acc.dc_id || r.dc_id || null,
            }), { ...result[0], branch_id: null, dc_id: null });
            res.json({
                location_id: merged.location_id,
                location_name: merged.location_name,
                latitude: merged.latitude,
                longitude: merged.longitude,
                address: merged.address,
                branch_id: merged.branch_id,
                dc_id: merged.dc_id,
            });
        }
    );
};

// CREATE location
exports.createLocation = (req, res) => {
    const { location_name, latitude, longitude, address } = req.body;

    db.query(
        'INSERT INTO location (location_name, latitude, longitude, address) VALUES (?, ?, ?, ?)',
        [location_name || null, latitude || null, longitude || null, address || null],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.status(201).json({ message: 'Location created', location_id: result.insertId });
        }
    );
};

// UPDATE location
exports.updateLocation = (req, res) => {
    const { location_name, latitude, longitude, address } = req.body;

    db.query(
        'UPDATE location SET location_name=COALESCE(?, location_name), latitude=?, longitude=?, address=? WHERE location_id=?',
        [location_name, latitude, longitude, address, req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Location updated' });
        }
    );
};

// DELETE location (forbidden if used by branch or DC)
exports.deleteLocation = (req, res) => {
    const id = req.params.id;
    db.query(
        'SELECT (SELECT COUNT(*) FROM branch WHERE location_id = ?) AS branch_count, (SELECT COUNT(*) FROM distribution WHERE location_id = ?) AS dc_count',
        [id, id],
        (err, rows) => {
            if (err) return res.status(500).json(err);
            const branchCount = (rows[0] && Number(rows[0].branch_count)) || 0;
            const dcCount = (rows[0] && Number(rows[0].dc_count)) || 0;
            if (branchCount > 0 || dcCount > 0) {
                const parts = [];
                if (branchCount > 0) parts.push('Branch');
                if (dcCount > 0) parts.push('DC');
                return res.status(409).json({
                    message: `Cannot delete: this location is used by ${parts.join(' and ')}. Remove the link first.`,
                });
            }
            db.query('DELETE FROM location WHERE location_id = ?', [id], (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({ message: 'Location deleted' });
            });
        }
    );
};
