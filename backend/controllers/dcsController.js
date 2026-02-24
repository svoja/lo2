const db = require('../config/db');

// GET all DCs (name from location, route_name from route)
exports.getAllDCs = (req, res) => {
    const sql = `SELECT d.dc_id, d.location_id, d.route_id,
                        l.location_name AS dc_name, l.latitude, l.longitude,
                        r.route_name
                 FROM distribution d
                 JOIN location l ON d.location_id = l.location_id
                 LEFT JOIN route r ON d.route_id = r.route_id
                 ORDER BY l.location_name`;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};

// GET DC by ID
exports.getDCById = (req, res) => {
    const sql = `SELECT d.dc_id, d.location_id, d.route_id,
                        l.location_name AS dc_name, l.latitude, l.longitude,
                        r.route_name
                 FROM distribution d
                 JOIN location l ON d.location_id = l.location_id
                 LEFT JOIN route r ON d.route_id = r.route_id
                 WHERE d.dc_id = ?`;
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: 'DC not found' });
        res.json(result[0]);
    });
};

// GET branches by DC id — ordered by distance from DC (nearest first) so branch order is "started by" the assigned DC
exports.getBranchesByDC = (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT b.branch_id, l.location_name AS branch_name, l.latitude, l.longitude, b.dc_id,
               (dl.latitude - l.latitude) * (dl.latitude - l.latitude) + (dl.longitude - l.longitude) * (dl.longitude - l.longitude) AS dist_sq
        FROM branch b
        JOIN location l ON b.location_id = l.location_id
        JOIN distribution d ON d.dc_id = b.dc_id
        JOIN location dl ON d.location_id = dl.location_id
        WHERE b.dc_id = ?
        ORDER BY COALESCE(dist_sq, 999999), l.location_name
    `;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        const rows = (result || []).map((r) => ({
            branch_id: r.branch_id,
            branch_name: r.branch_name,
            latitude: r.latitude,
            longitude: r.longitude,
            dc_id: r.dc_id,
        }));
        res.json(rows);
    });
};

// CREATE DC: body { location_id, route_id? } — location must not already be a DC
exports.createDC = (req, res) => {
    const { location_id, route_id } = req.body;
    if (location_id == null || location_id === '') {
        return res.status(400).json({ message: 'location_id is required' });
    }
    const locId = Number(location_id);
    const routeId = route_id != null && route_id !== '' ? Number(route_id) : null;
    db.query('SELECT dc_id FROM distribution WHERE location_id = ?', [locId], (err, existing) => {
        if (err) return res.status(500).json(err);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'This location is already used as a DC' });
        }
        db.query(
            'INSERT INTO distribution (location_id, route_id) VALUES (?, ?)',
            [locId, routeId],
            (err2, result) => {
                if (err2) return res.status(500).json(err2);
                res.status(201).json({ message: 'DC created', dc_id: result.insertId });
            }
        );
    });
};

// UPDATE DC: body { route_id? } — name/coords edited in Locations
exports.updateDC = (req, res) => {
    const { route_id } = req.body;
    const dcId = req.params.id;
    const routeId = route_id !== undefined && route_id !== '' ? (route_id == null ? null : Number(route_id)) : undefined;
    if (routeId === undefined) {
        return res.json({ message: 'DC updated' });
    }
    db.query('UPDATE distribution SET route_id = ? WHERE dc_id = ?', [routeId, dcId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'DC updated' });
    });
};

// DELETE DC (branches referencing this DC will have dc_id set to NULL by FK)
exports.deleteDC = (req, res) => {
    db.query('DELETE FROM distribution WHERE dc_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'DC deleted' });
    });
};
