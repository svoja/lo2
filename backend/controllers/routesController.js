const db = require('../config/db');

// GET all routes
exports.getRoutes = (req, res) => {
    const sql = `SELECT route_id, route_name, start_location_id, end_location_id FROM route ORDER BY route_name`;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
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
