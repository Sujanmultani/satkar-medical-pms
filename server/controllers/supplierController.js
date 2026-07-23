const { searchSuppliers, findOrCreateSupplier } = require('../services/supplierService');

// @desc    Get suppliers with autocomplete search
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await searchSuppliers(req.query.search);
    return res.status(200).json({ data: suppliers });
  } catch (error) {
    next(error);
  }
};

// @desc    Find or create supplier by name
// @route   POST /api/suppliers/find-or-create
// @access  Private
const findOrCreateSupplierHandler = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: { code: 'INVALID_NAME', message: 'Supplier name is required.' },
      });
    }

    const supplier = await findOrCreateSupplier({ name, phone, address });
    return res.status(200).json({ data: supplier });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  findOrCreateSupplierHandler,
};
