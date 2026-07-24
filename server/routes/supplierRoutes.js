const express = require('express');
const router = express.Router();
const { getSuppliers, getSupplierById, findOrCreateSupplierHandler } = require('../controllers/supplierController.js');
const { protect } = require('../middleware/authMiddleware.js');

router.use(protect);

router.get('/', getSuppliers);
router.post('/find-or-create', findOrCreateSupplierHandler);
router.get('/:id', getSupplierById);

module.exports = router;
