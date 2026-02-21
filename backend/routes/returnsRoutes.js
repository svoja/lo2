const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');

router.get('/', returnsController.getAllReturns);
router.post('/', returnsController.createReturn);
router.get('/:id', returnsController.getReturnById);
router.put('/:id', returnsController.updateReturn);
router.delete('/:id', returnsController.deleteReturn);

module.exports = router;