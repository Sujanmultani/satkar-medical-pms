const express = require('express');
const router = express.Router();
const {
  createBatch,
  getBatches,
  updateBatch,
  updatePaymentStatus,
  deleteBatch,
  getExpiringSoonBatches,
  getExpiredBatches,
} = require('../controllers/batchController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createBatch)
  .get(getBatches);

router.get('/expiring-soon', getExpiringSoonBatches);
router.get('/expired', getExpiredBatches);

router.patch('/:id/payment-status', updatePaymentStatus);

router.route('/:id')
  .put(updateBatch)
  .delete(deleteBatch);

module.exports = router;
