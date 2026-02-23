const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');

// Create shipment with orders (must be before /:id routes)
router.post('/create-with-orders', shipmentController.createWithOrders);

// Main CRUD operations
router.get('/', shipmentController.getAllShipments);
router.post('/', shipmentController.createShipment);
router.get('/:id/orders', shipmentController.getShipmentOrders);
router.get('/:id', shipmentController.getShipmentById);
router.put('/:id', shipmentController.updateShipment);
router.delete('/:id', shipmentController.deleteShipment);

// Shipment operations
router.put('/:shipment_id/assign-truck', shipmentController.assignTruck);
router.put('/:id/start', shipmentController.startShipment);
router.put('/:id/complete', shipmentController.completeShipment);
router.put('/:id/receive', shipmentController.receiveShipment);
router.get('/:id/capacity', shipmentController.getShipmentCapacity);
router.put('/:id/auto-assign', shipmentController.autoAssignTruck);
router.post('/:shipment_id/orders', shipmentController.addOrdersToShipment);

module.exports = router;