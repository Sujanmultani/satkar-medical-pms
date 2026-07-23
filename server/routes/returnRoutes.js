const express = require('express');
const router = express.Router();
const { createReturn, getReturns, getReturnById } = require('../controllers/returnController.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

router.route('/').post(createReturn).get(getReturns);
router.route('/:id').get(getReturnById);

module.exports = router;
