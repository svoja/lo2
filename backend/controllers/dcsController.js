const db = require('../config/db');

// GET branches by DC id
exports.getBranchesByDC = (req, res) => {
    const { id } = req.params;
    const sql = `SELECT branch_id, branch_name, latitude, longitude, dc_id FROM branch WHERE dc_id = ? ORDER BY branch_name`;
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};
