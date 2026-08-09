const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  scanInvoice,
  confirmInvoice,
  searchInvoiceByNumber,
  checkDuplicateInvoice,
  deleteInvoice,
  getOrCreateInvoiceShareLink,
  getInvoiceByShareToken,
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');
const { scanRateLimiter } = require('../middleware/rateLimiter');

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit for high-resolution multi-page photos
    files: 10, // cap number of files per scan request — prevents server RAM exhaustion (crash)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) or PDFs are allowed!'), false);
    }
  },
});

// PUBLIC ROUTE (NO AUTH) - Must be defined BEFORE protect middleware
router.get('/public/:token', getInvoiceByShareToken);

router.use(protect);

router.get('/search', searchInvoiceByNumber);
router.get('/check-duplicate', checkDuplicateInvoice);
router.get('/:id/share-link', getOrCreateInvoiceShareLink);
router.post('/scan', scanRateLimiter, upload.any(), scanInvoice);
router.post('/confirm', confirmInvoice);
router.delete('/:id', deleteInvoice);

module.exports = router;
