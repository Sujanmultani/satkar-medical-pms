const express = require('express');
const router = express.Router();
const {
  createBill,
  getBills,
  getBillById,
  markPrinted,
  shareBillStub,
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createBill)
  .get(getBills);

router.route('/:id')
  .get(getBillById);

router.patch('/:id/mark-printed', markPrinted);
router.post('/:id/share', shareBillStub);

module.exports = router;
