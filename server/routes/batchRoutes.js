const express = require('express');
const router = express.Router();
const {
  createBatch,
  getBatches,
  updateBatch,
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

router.route('/:id')
  .put(updateBatch)
  .delete(deleteBatch);

module.exports = router;
