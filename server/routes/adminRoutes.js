const express = require('express');
const router = express.Router();
const { triggerManualBackup } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/trigger-backup', triggerManualBackup);

module.exports = router;
