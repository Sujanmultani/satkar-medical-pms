const Supplier = require('../models/Supplier');
const Batch = require('../models/Batch');
const { searchSuppliers, findOrCreateSupplier } = require('../services/supplierService');

// @desc    Get suppliers list (paginated, with search & payment summaries)
// @route   GET /api/suppliers
// @access  Private
const getSuppliers = async (req, res, next) => {
  try {
    const { search, page: pageReq, limit: limitReq } = req.query;

    // If limit === 'all' or no page param passed, fallback to searchSuppliers for fast autocomplete
    if (!pageReq && !limitReq && search !== undefined) {
      const suppliers = await searchSuppliers(search);
      return res.status(200).json({ data: suppliers });
    }

    const page = parseInt(pageReq, 10) || 1;
    const limit = Math.min(parseInt(limitReq, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (search && search.trim()) {
      const escapedQuery = search.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
      filter.name = new RegExp(escapedQuery, 'i');
    }

    const total = await Supplier.countDocuments(filter);
    const suppliers = await Supplier.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach batch payment summaries to each returned supplier
    const supplierIds = suppliers.map((s) => s._id);
    const batches = await Batch.find({ supplierId: { $in: supplierIds } }).lean();

    const summaryBySupplier = {};
    supplierIds.forEach((id) => {
      summaryBySupplier[id.toString()] = { totalDue: 0, pendingCount: 0, paidCount: 0, totalBatches: 0 };
    });

    batches.forEach((b) => {
      const supId = b.supplierId ? b.supplierId.toString() : null;
      if (supId && summaryBySupplier[supId]) {
        summaryBySupplier[supId].totalBatches++;
        if (b.paymentStatus === 'paid') {
          summaryBySupplier[supId].paidCount++;
        } else {
          summaryBySupplier[supId].pendingCount++;
          summaryBySupplier[supId].totalDue += (b.amountDue || (b.qty * b.purchaseRate) || 0);
        }
      }
    });

    const suppliersWithSummary = suppliers.map((s) => ({
      ...s,
      summary: summaryBySupplier[s._id.toString()] || { totalDue: 0, pendingCount: 0, paidCount: 0, totalBatches: 0 },
    }));

    return res.status(200).json({
      data: suppliersWithSummary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single supplier details with all supplied batches & summary
// @route   GET /api/suppliers/:id
// @access  Private
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id).lean();
    if (!supplier) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Supplier not found.' },
      });
    }

    // Fetch all batches referencing this supplier
    const batches = await Batch.find({ supplierId: supplier._id })
      .populate('itemId', 'name composition category unit hsnCode storeType')
      .sort({ createdAt: -1 })
      .lean();

    let totalDue = 0;
    let pendingCount = 0;
    let paidCount = 0;

    const batchesProcessed = batches.map((b) => {
      const isPaid = b.paymentStatus === 'paid';
      const due = b.amountDue !== undefined && b.amountDue !== null ? b.amountDue : (b.qty * b.purchaseRate);

      if (isPaid) {
        paidCount++;
      } else {
        pendingCount++;
        totalDue += due;
      }

      return {
        ...b,
        amountDue: due,
      };
    });

    return res.status(200).json({
      data: {
        supplier,
        batches: batchesProcessed,
        summary: {
          totalDue: Math.round(totalDue * 100) / 100,
          pendingCount,
          paidCount,
          totalBatches: batches.length,
        },
      },
    });
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
  getSupplierById,
  findOrCreateSupplierHandler,
};
