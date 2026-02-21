const db = require('../config/db');

// GET all branches
exports.getAllBranches = (req, res) => {
    db.query('SELECT * FROM branch', (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
};

// GET branch by ID
exports.getBranchById = (req, res) => {
    db.query(
        'SELECT * FROM branch WHERE branch_id = ?',
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.length === 0)
                return res.status(404).json({ message: 'Branch not found' });

            res.json(result[0]);
        }
    );
};

// CREATE branch
exports.createBranch = (req, res) => {
    const { branch_name, latitude, longitude } = req.body;

    db.query(
        'INSERT INTO branch (branch_name, latitude, longitude) VALUES (?, ?, ?)',
        [branch_name, latitude, longitude],
        (err, result) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Branch created' });
        }
    );
};

// UPDATE branch
exports.updateBranch = (req, res) => {
    const { branch_name, latitude, longitude } = req.body;

    db.query(
        'UPDATE branch SET branch_name=?, latitude=?, longitude=? WHERE branch_id=?',
        [branch_name, latitude, longitude, req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Branch updated' });
        }
    );
};

// DELETE branch
exports.deleteBranch = (req, res) => {
    db.query(
        'DELETE FROM branch WHERE branch_id=?',
        [req.params.id],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ message: 'Branch deleted' });
        }
    );
};
