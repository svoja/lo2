const express = require('express');
const router = express.Router();
const dcsController = require('../controllers/dcsController');

router.get('/', dcsController.getAllDCs);
router.post('/', dcsController.createDC);
// Must be before /:id so "1/branches" is not matched as id="1/branches"
router.get('/:id/branches', dcsController.getBranchesByDC);
// Chain /:id so DELETE is registered correctly
router.route('/:id')
  .get(dcsController.getDCById)
  .put(dcsController.updateDC)
  .delete(dcsController.deleteDC);

module.exports = router;
