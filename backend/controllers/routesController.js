const db = require('../config/db');

// GET all routes (with location names)
exports.getRoutes = (req, res) => {
    const sql = `
        SELECT r.route_id, r.route_name, r.start_location_id, r.end_location_id,
               s.location_name AS start_location_name, e.location_name AS end_location_name
        FROM route r
        LEFT JOIN location s ON r.start_location_id = s.location_id
        LEFT JOIN location e ON r.end_location_id = e.location_id
        ORDER BY r.route_name
    `;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};

// GET route by id
exports.getRouteById = (req, res) => {
    const { id } = req.params;
    const sql = `
        SELECT r.route_id, r.route_name, r.start_location_id, r.end_location_id,
               s.location_name AS start_location_name, e.location_name AS end_location_name
        FROM route r
        LEFT JOIN location s ON r.start_location_id = s.location_id
        LEFT JOIN location e ON r.end_location_id = e.location_id
        WHERE r.route_id = ?
    `;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        if (!result || result.length === 0) return res.status(404).json({ message: 'Route not found' });
        res.json(result[0]);
    });
};

// GET DCs by route id
exports.getDCsByRoute = (req, res) => {
    const { id } = req.params;
    const sql = `SELECT d.dc_id, l.location_name AS dc_name, l.latitude, l.longitude, d.route_id FROM distribution d JOIN location l ON d.location_id = l.location_id WHERE d.route_id = ? ORDER BY d.dc_id`;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};

// CREATE route
exports.createRoute = (req, res) => {
    const { route_name, start_location_id, end_location_id } = req.body;
    if (!route_name || !String(route_name).trim()) return res.status(400).json({ message: 'route_name required' });
    const sql = `INSERT INTO route (route_name, start_location_id, end_location_id) VALUES (?, ?, ?)`;
    db.query(sql, [
        String(route_name).trim(),
        start_location_id != null && start_location_id !== '' ? Number(start_location_id) : null,
        end_location_id != null && end_location_id !== '' ? Number(end_location_id) : null,
    ], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.status(201).json({ message: 'Route created', route_id: result.insertId });
    });
};

// UPDATE route
exports.updateRoute = (req, res) => {
    const { id } = req.params;
    const { route_name, start_location_id, end_location_id } = req.body;
    const sql = `UPDATE route SET route_name = ?, start_location_id = ?, end_location_id = ? WHERE route_id = ?`;
    db.query(sql, [
        route_name != null && route_name !== '' ? String(route_name).trim() : null,
        start_location_id != null && start_location_id !== '' ? Number(start_location_id) : null,
        end_location_id != null && end_location_id !== '' ? Number(end_location_id) : null,
        id,
    ], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Route not found' });
        res.json({ message: 'Route updated' });
    });
};

// DELETE route
exports.deleteRoute = (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM `route` WHERE route_id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Route not found' });
        res.json({ message: 'Route deleted' });
    });
};
