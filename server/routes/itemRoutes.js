const express = require('express');
const router = express.Router();
const {
  createItem,
  getItems,
  searchComposition,
  getItemAlternatives,
  getItemById,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .post(createItem)
  .get(getItems);

router.get('/search-composition', searchComposition);
router.get('/:id/alternatives', getItemAlternatives);

router.route('/:id')
  .get(getItemById)
  .put(updateItem)
  .delete(deleteItem);

module.exports = router;
