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

// CREATE truck (truck_type: 'Linehaul' | 'LastMile', default LastMile)
exports.createTruck = (req, res) => {
    const { plate_number, capacity_m3, status, truck_type } = req.body;
    const type = truck_type === 'Linehaul' ? 'Linehaul' : 'LastMile';

    db.query(
        'INSERT INTO truck (plate_number, capacity_m3, status, truck_type) VALUES (?, ?, ?, ?)',
        [plate_number, capacity_m3, status || 'available', type],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Truck created' });
        }
    );
};

// UPDATE truck
exports.updateTruck = (req, res) => {
    const { plate_number, capacity_m3, status, truck_type } = req.body;
    const type = truck_type !== undefined ? (truck_type === 'Linehaul' ? 'Linehaul' : 'LastMile') : undefined;

    const updates = ['plate_number=?, capacity_m3=?, status=?'];
    const values = [plate_number, capacity_m3, status || 'available'];
    if (type !== undefined) {
        updates.push('truck_type=?');
        values.push(type);
    }
    values.push(req.params.id);
    db.query(
        `UPDATE truck SET ${updates.join(', ')} WHERE truck_id=?`,
        values,
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
