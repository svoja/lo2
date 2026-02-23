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
    const sql = `SELECT dc_id, dc_name, latitude, longitude, route_id FROM distribution WHERE route_id = ? ORDER BY dc_name`;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};
