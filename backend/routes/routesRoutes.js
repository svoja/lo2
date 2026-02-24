const express = require('express');
const router = express.Router();
const routesController = require('../controllers/routesController');

router.get('/', routesController.getRoutes);
router.post('/', routesController.createRoute);
// Must be before /:id so "2/dcs" is not matched as id="2/dcs"
router.get('/:id/dcs', routesController.getDCsByRoute);
// Chain all /:id methods so DELETE is definitely registered
router.route('/:id')
  .get(routesController.getRouteById)
  .put(routesController.updateRoute)
  .delete(routesController.deleteRoute);

module.exports = router;
