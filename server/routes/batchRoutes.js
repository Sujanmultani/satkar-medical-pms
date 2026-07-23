const express = require('express');
const router = express.Router();
const {
  createBatch,
  getBatches,
  updateBatch,
  deleteBatch,
} = require('../controllers/batchController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createBatch)
  .get(getBatches);

router.route('/:id')
  .put(updateBatch)
  .delete(deleteBatch);

module.exports = router;
