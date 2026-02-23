const db = require('../config/db');

// GET all locations
exports.getAllLocations = (req, res) => {
    db.query('SELECT location_id, location_name, latitude, longitude, address FROM location ORDER BY location_name', (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// GET location by ID
exports.getLocationById = (req, res) => {
    db.query(
        'SELECT location_id, location_name, latitude, longitude, address FROM location WHERE location_id = ?',
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0)
                return res.status(404).json({ message: 'Location not found' });
            res.json(result[0]);
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

// DELETE location
exports.deleteLocation = (req, res) => {
    db.query('DELETE FROM location WHERE location_id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Location deleted' });
    });
};
