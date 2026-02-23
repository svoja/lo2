const db = require('../config/db');

const BOX_VOLUME = 0.036; // m3 per carton

// POST /api/planning/preview-volume
// Body: { branches: [{ branch_id, items: [{ product_id, quantity }] }] }
// Returns: { total_volume, cartons, utilization_percent } (utilization from first available truck if any)
exports.previewVolume = async (req, res) => {
    const { branches } = req.body;
    const conn = db.promise();

    if (!Array.isArray(branches) || branches.length === 0) {
        return res.status(400).json({ message: 'branches array required' });
    }

    try {
        let totalVolume = 0;
        let totalCartons = 0;

        for (const branch of branches) {
            const items = branch.items || [];
            for (const item of items) {
                const [rows] = await conn.query(
                    `SELECT unit_price, length, width, height, volume FROM products WHERE product_id = ?`,
                    [item.product_id]
                );
                if (rows.length === 0) continue;
                const p = rows[0];
                const qty = Number(item.quantity) || 0;
                if (qty <= 0) continue;
                let volPerUnit;
                if (p.volume != null && Number(p.volume) > 0) {
                    volPerUnit = Number(p.volume);
                } else if (p.length != null && p.width != null && p.height != null) {
                    volPerUnit = (Number(p.length) / 100) * (Number(p.width) / 100) * (Number(p.height) / 100);
                } else {
                    volPerUnit = 0;
                }
                const vol = volPerUnit * qty;
                totalVolume += vol;
                totalCartons += Math.ceil(vol / BOX_VOLUME);
            }
        }

        let utilization_percent = null;
        const [trucks] = await conn.query(
            `SELECT capacity_m3 FROM truck WHERE status = 'available' ORDER BY capacity_m3 DESC LIMIT 1`
        );
        if (trucks.length > 0 && Number(trucks[0].capacity_m3) > 0) {
            utilization_percent = Math.min(100, Math.round((Number(totalVolume) / Number(trucks[0].capacity_m3)) * 1000) / 10);
        }

        res.json({
            total_volume: Number(totalVolume.toFixed(4)),
            cartons: totalCartons,
            utilization_percent
        });
    } catch (err) {
        res.status(500).json({ message: err.message, code: err.code });
    }
};
