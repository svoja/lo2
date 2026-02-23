const express = require('express');
const router = express.Router();
const dcsController = require('../controllers/dcsController');

router.get('/', dcsController.getAllDCs);
router.get('/:id/branches', dcsController.getBranchesByDC);

module.exports = router;
