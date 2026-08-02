const express = require('express');
const router = express.Router();
const {
  createBill,
  getBills,
  getBillById,
  markPrinted,
  shareBill,
  deleteBill,
  getOrCreateShareLink,
  getBillByShareToken,
} = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

// PUBLIC ROUTE (NO AUTH) - Must be defined BEFORE protect middleware
router.get('/public/:token', getBillByShareToken);

// PROTECTED ROUTES (Require Authorization Bearer Token)
router.use(protect);

router.route('/')
  .post(createBill)
  .get(getBills);

router.get('/:id/share-link', getOrCreateShareLink);

router.route('/:id')
  .get(getBillById)
  .delete(deleteBill);

router.patch('/:id/mark-printed', markPrinted);
router.post('/:id/share', shareBill);

module.exports = router;
