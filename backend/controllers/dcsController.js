const db = require('../config/db');

// GET all DCs (for dropdowns; name from location)
exports.getAllDCs = (req, res) => {
    const sql = `SELECT d.dc_id, l.location_name AS dc_name, l.latitude, l.longitude, d.route_id FROM distribution d JOIN location l ON d.location_id = l.location_id ORDER BY l.location_name`;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};

// GET branches by DC id
exports.getBranchesByDC = (req, res) => {
    const { id } = req.params;
    const sql = `SELECT b.branch_id, l.location_name AS branch_name, l.latitude, l.longitude, b.dc_id FROM branch b JOIN location l ON b.location_id = l.location_id WHERE b.dc_id = ? ORDER BY l.location_name`;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};
