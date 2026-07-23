const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getSettings)
  .put(updateSettings);

module.exports = router;
