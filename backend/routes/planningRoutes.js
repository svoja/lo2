const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');

router.post('/preview-volume', planningController.previewVolume);

module.exports = router;
