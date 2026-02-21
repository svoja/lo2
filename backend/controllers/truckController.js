const db = require('../config/db');

// GET all trucks
exports.getAllTrucks = (req, res) => {
    db.query('SELECT * FROM truck', (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// GET truck by ID
exports.getTruckById = (req, res) => {
    db.query(
        'SELECT * FROM truck WHERE truck_id = ?',
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0)
                return res.status(404).json({ message: 'Truck not found' });

            res.json(result[0]);
        }
    );
};

// CREATE truck
exports.createTruck = (req, res) => {
    const { plate_number, capacity_m3, status } = req.body;

    db.query(
        'INSERT INTO truck (plate_number, capacity_m3, status) VALUES (?, ?, ?)',
        [plate_number, capacity_m3, status],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Truck created' });
        }
    );
};

// UPDATE truck
exports.updateTruck = (req, res) => {
    const { plate_number, capacity_m3, status } = req.body;

    db.query(
        'UPDATE truck SET plate_number=?, capacity_m3=?, status=? WHERE truck_id=?',
        [plate_number, capacity_m3, status, req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Truck updated' });
        }
    );
};

// DELETE truck
exports.deleteTruck = (req, res) => {
    db.query(
        'DELETE FROM truck WHERE truck_id=?',
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Truck deleted' });
        }
    );
};
