const Batch = require('../models/Batch');
const Item = require('../models/Item');
const { computeBatchStatus } = require('../utils/batchStatus');
const { findOrCreateSupplier } = require('../services/supplierService');

// @desc    Create batch for an item
// @route   POST /api/batches
// @access  Private
const createBatch = async (req, res, next) => {
  try {
    const { itemId, batchNo, mfgDate, expiryDate, qty, purchaseRate, mrp, gstPercent, supplierName, supplierId, paymentStatus, amountDue } = req.body;

    if (!itemId) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'itemId is required.' },
      });
    }

    const itemExists = await Item.findById(itemId);
    if (!itemExists) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Referenced item not found.' },
      });
    }

    if (!batchNo || !batchNo.trim()) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Batch number is required.' },
      });
    }

    if (!expiryDate) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Expiry date is required.' },
      });
    }

    const numQty = Number(qty) || 0;
    const numPurchaseRate = Number(purchaseRate) || 0;
    const numMrp = Number(mrp) || 0;
    const numGstPercent = Number(gstPercent) || 0;

    if (numQty < 0 || numPurchaseRate < 0 || numMrp < 0 || numGstPercent < 0) {
      return res.status(400).json({
        error: { code: 'INVALID_NUMERIC', message: 'Quantities and rates must be non-negative numbers.' },
      });
    }

    let finalSupplierId = supplierId || undefined;
    if (supplierName && supplierName.trim()) {
      const sup = await findOrCreateSupplier({ name: supplierName.trim() });
      if (sup) finalSupplierId = sup._id;
    }

    const status = computeBatchStatus(expiryDate);
    const finalAmountDue = amountDue !== undefined ? Math.max(0, Number(amountDue) || 0) : (numQty * numPurchaseRate);
    const finalPaymentStatus = ['paid', 'pending'].includes(paymentStatus) ? paymentStatus : 'pending';

    const batch = await Batch.create({
      itemId,
      supplierId: finalSupplierId,
      batchNo: batchNo.trim(),
      mfgDate: mfgDate ? new Date(mfgDate) : null,
      expiryDate: new Date(expiryDate),
      qty: numQty,
      purchaseRate: numPurchaseRate,
      mrp: numMrp,
      gstPercent: numGstPercent,
      status,
      paymentStatus: finalPaymentStatus,
      amountDue: finalAmountDue,
    });

    const populated = await Batch.findById(batch._id).populate('supplierId', 'name phone address').lean();

    return res.status(201).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Get batches (optionally filtered by itemId)
// @route   GET /api/batches
// @access  Private
const getBatches = async (req, res, next) => {
  try {
    const { itemId } = req.query;
    const filter = {};
    if (itemId) {
      filter.itemId = itemId;
    }

    const batches = await Batch.find(filter)
      .populate('supplierId', 'name phone address')
      .sort({ expiryDate: 1 })
      .lean();

    const batchesWithStatus = batches.map((b) => ({
      ...b,
      status: computeBatchStatus(b.expiryDate),
    }));

    return res.status(200).json({ data: batchesWithStatus });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch
// @route   PUT /api/batches/:id
// @access  Private
const updateBatch = async (req, res, next) => {
  try {
    const { batchNo, mfgDate, expiryDate, qty, purchaseRate, mrp, gstPercent, supplierName, supplierId, paymentStatus, amountDue } = req.body;

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Batch not found.' },
      });
    }

    if (supplierName && supplierName.trim()) {
      const sup = await findOrCreateSupplier({ name: supplierName.trim() });
      if (sup) batch.supplierId = sup._id;
    } else if (supplierId !== undefined) {
      batch.supplierId = supplierId || null;
    }

    if (batchNo !== undefined) batch.batchNo = batchNo.trim();
    if (mfgDate !== undefined) batch.mfgDate = mfgDate ? new Date(mfgDate) : null;
    if (expiryDate !== undefined) {
      batch.expiryDate = new Date(expiryDate);
      batch.status = computeBatchStatus(expiryDate);
    }
    if (qty !== undefined) batch.qty = Math.max(0, Number(qty) || 0);
    if (purchaseRate !== undefined) batch.purchaseRate = Math.max(0, Number(purchaseRate) || 0);
    if (mrp !== undefined) batch.mrp = Math.max(0, Number(mrp) || 0);
    if (gstPercent !== undefined) batch.gstPercent = Math.max(0, Number(gstPercent) || 0);
    if (paymentStatus && ['paid', 'pending'].includes(paymentStatus)) batch.paymentStatus = paymentStatus;
    if (amountDue !== undefined) {
      batch.amountDue = Math.max(0, Number(amountDue) || 0);
    } else if ((qty !== undefined || purchaseRate !== undefined) && batch.supplierId) {
      batch.amountDue = batch.qty * batch.purchaseRate;
    }

    await batch.save();
    const populated = await Batch.findById(batch._id).populate('supplierId', 'name phone address').lean();

    return res.status(200).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update batch payment status (paid / pending)
// @route   PATCH /api/batches/:id/payment-status
// @access  Private
const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus || !['paid', 'pending'].includes(paymentStatus)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATUS', message: 'paymentStatus must be paid or pending.' },
      });
    }

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Batch not found.' },
      });
    }

    batch.paymentStatus = paymentStatus;
    await batch.save();

    const populated = await Batch.findById(batch._id)
      .populate('itemId', 'name composition category unit hsnCode storeType')
      .populate('supplierId', 'name phone address')
      .lean();

    return res.status(200).json({ data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete batch
// @route   DELETE /api/batches/:id
// @access  Private
const deleteBatch = async (req, res, next) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Batch not found.' },
      });
    }

    await batch.deleteOne();
    return res.status(200).json({ message: 'Batch deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Helper for status-filtered batch queries (expiring_soon / expired)
const getBatchesByStatus = async (req, res, next, targetStatus) => {
  try {
    const { storeType } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const batchFilter = { status: targetStatus };

    if (storeType && ['medical', 'provision'].includes(storeType)) {
      const items = await Item.find({ storeType }).select('_id').lean();
      const itemIds = items.map((i) => i._id);
      batchFilter.itemId = { $in: itemIds };
    }

    const total = await Batch.countDocuments(batchFilter);
    const batches = await Batch.find(batchFilter)
      .populate('itemId', 'name composition category unit hsnCode storeType')
      .populate('supplierId', 'name phone address')
      .sort({ expiryDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      data: batches,
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

// @desc    Get expiring soon batches (status: expiring_soon)
// @route   GET /api/batches/expiring-soon
// @access  Private
const getExpiringSoonBatches = (req, res, next) => getBatchesByStatus(req, res, next, 'expiring_soon');

// @desc    Get expired batches (status: expired)
// @route   GET /api/batches/expired
// @access  Private
const getExpiredBatches = (req, res, next) => getBatchesByStatus(req, res, next, 'expired');

module.exports = {
  createBatch,
  getBatches,
  updateBatch,
  updatePaymentStatus,
  deleteBatch,
  getExpiringSoonBatches,
  getExpiredBatches,
};
