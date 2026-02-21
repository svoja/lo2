const express = require('express');
const router = express.Router();
const truckController = require('../controllers/truckController');

router.get('/', truckController.getAllTrucks);
router.post('/', truckController.createTruck);
router.get('/:id', truckController.getTruckById);
router.put('/:id', truckController.updateTruck);
router.delete('/:id', truckController.deleteTruck);

module.exports = router;