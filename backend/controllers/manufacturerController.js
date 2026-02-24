const db = require('../config/db');

// GET all manufacturers (name from location)
exports.getAllManufacturers = (req, res) => {
    const sql = `SELECT m.manufacturer_id, m.location_id,
                        l.location_name AS manufacturer_name, l.latitude, l.longitude
                 FROM manufacturer m
                 JOIN location l ON m.location_id = l.location_id
                 ORDER BY l.location_name`;
    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ message: err.message, code: err.code });
        res.json(result);
    });
};

// GET manufacturer by ID
exports.getManufacturerById = (req, res) => {
    const sql = `SELECT m.manufacturer_id, m.location_id,
                        l.location_name AS manufacturer_name, l.latitude, l.longitude
                 FROM manufacturer m
                 JOIN location l ON m.location_id = l.location_id
                 WHERE m.manufacturer_id = ?`;
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length === 0) return res.status(404).json({ message: 'Manufacturer not found' });
        res.json(result[0]);
    });
};

// CREATE: body { location_id }
exports.createManufacturer = (req, res) => {
    const { location_id } = req.body;
    if (location_id == null || location_id === '') {
        return res.status(400).json({ message: 'location_id is required' });
    }
    const locId = Number(location_id);
    db.query('SELECT manufacturer_id FROM manufacturer WHERE location_id = ?', [locId], (err, existing) => {
        if (err) return res.status(500).json(err);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'This location is already used as a manufacturer' });
        }
        db.query('INSERT INTO manufacturer (location_id) VALUES (?)', [locId], (err2, result) => {
            if (err2) return res.status(500).json(err2);
            res.status(201).json({ message: 'Manufacturer created', manufacturer_id: result.insertId });
        });
    });
};

// UPDATE: no editable fields (location change = delete + create)
exports.updateManufacturer = (req, res) => {
    res.json({ message: 'Manufacturer updated' });
};

// DELETE
exports.deleteManufacturer = (req, res) => {
    db.query('DELETE FROM manufacturer WHERE manufacturer_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Manufacturer deleted' });
    });
};
