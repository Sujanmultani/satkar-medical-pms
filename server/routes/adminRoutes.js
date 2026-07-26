const express = require('express');
const router = express.Router();
const { triggerManualBackup, triggerManualExpiryEmail } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/trigger-backup', triggerManualBackup);
router.post('/trigger-expiry-email', triggerManualExpiryEmail);

module.exports = router;
