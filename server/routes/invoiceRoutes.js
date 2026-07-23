const express = require('express');
const router = express.Router();
const multer = require('multer');
const { scanInvoice, confirmInvoice } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP) or PDFs are allowed!'), false);
    }
  },
});

router.use(protect);

router.post('/scan', upload.single('image'), scanInvoice);
router.post('/confirm', confirmInvoice);

module.exports = router;
