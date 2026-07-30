const express = require('express');
const router = express.Router();
const { triggerManualBackup, triggerManualExpiryEmail, clearAllData } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/trigger-backup', triggerManualBackup);
router.post('/trigger-expiry-email', triggerManualExpiryEmail);
router.post('/clear-all-data', clearAllData);

module.exports = router;
