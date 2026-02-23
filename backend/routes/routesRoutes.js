const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routesController');

router.get('/', routesController.getRoutes);
router.get('/:id/dcs', routesController.getDCsByRoute);

module.exports = router;
