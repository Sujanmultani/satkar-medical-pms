const Return = require('../models/Return');
const Batch = require('../models/Batch');
const Item = require('../models/Item');
const Bill = require('../models/Bill');

// Helper to generate unique return number (RET-YYYYMMDD-XXXX)
const generateReturnNumber = async (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');

  const startOfDay = new Date(d);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);

  const countToday = await Return.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = String(countToday + 1).padStart(4, '0');
  return `RET-${dateStr}-${sequence}`;
};

// @desc    Create new Return record (supplier or customer)
// @route   POST /api/returns
// @access  Private
const createReturn = async (req, res, next) => {
  try {
    const {
      type,
      itemId,
      batchId,
      storeType,
      quantity,
      reason,
      returnDate,
      restocked,
      supplierName,
      creditNoteNo,
      referenceBillId,
      customerName,
      customerPhone,
      refundAmount,
      notes,
    } = req.body;

    if (!type || !['supplier', 'customer'].includes(type)) {
      return res.status(400).json({
        error: { code: 'INVALID_TYPE', message: 'Return type must be either supplier or customer.' },
      });
    }

    if (!itemId || !batchId || !quantity || quantity < 1 || !reason || !returnDate) {
      return res.status(400).json({
        error: { code: 'MISSING_FIELDS', message: 'Please provide itemId, batchId, quantity, reason, and returnDate.' },
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Referenced batch not found.' },
      });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Referenced item not found.' },
      });
    }

    const numQty = Number(quantity);
    let finalRestocked = false;

    if (type === 'supplier') {
      if (batch.qty < numQty) {
        return res.status(400).json({
          error: {
            code: 'EXCEEDS_STOCK',
            message: `Cannot return ${numQty} units to supplier. Only ${batch.qty} units available in batch ${batch.batchNo}.`,
          },
        });
      }
      batch.qty -= numQty;
      await batch.save();
      finalRestocked = false;
    } else {
      // Customer return
      if (referenceBillId) {
        const bill = await Bill.findById(referenceBillId);
        if (bill) {
          const lineItem = bill.items.find((i) => i.batchId.toString() === batchId.toString());
          if (lineItem && numQty > lineItem.qty) {
            return res.status(400).json({
              error: {
                code: 'EXCEEDS_SOLD_QTY',
                message: `Cannot return ${numQty} units. Original bill only had ${lineItem.qty} units of batch ${batch.batchNo}.`,
              },
            });
          }
        }
      }

      if (restocked !== undefined) {
        finalRestocked = Boolean(restocked);
      } else {
        finalRestocked = !['expired', 'damaged'].includes(reason);
      }

      if (finalRestocked) {
        batch.qty += numQty;
        await batch.save();
      }
    }

    const returnNo = await generateReturnNumber(returnDate);

    const newReturn = await Return.create({
      returnNo,
      type,
      itemId,
      batchId,
      storeType: storeType || item.storeType || 'medical',
      quantity: numQty,
      reason,
      returnDate: new Date(returnDate),
      restocked: finalRestocked,
      supplierName: supplierName ? supplierName.trim() : '',
      creditNoteNo: creditNoteNo ? creditNoteNo.trim() : '',
      referenceBillId: referenceBillId || null,
      customerName: customerName ? customerName.trim() : '',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      refundAmount: Number(refundAmount) || 0,
      notes: notes ? notes.trim() : '',
    });

    const populatedReturn = await Return.findById(newReturn._id)
      .populate('itemId', 'name composition category unit hsnCode storeType')
      .populate({ path: 'batchId', select: 'batchNo expiryDate mrp purchaseRate supplierId', populate: { path: 'supplierId', select: 'name phone address' } })
      .populate('referenceBillId', 'billNo billDate totalAmount')
      .lean();

    return res.status(201).json({ data: populatedReturn });
  } catch (error) {
    next(error);
  }
};

// @desc    Get returns list (filterable by type, storeType, date range, search)
// @route   GET /api/returns
// @access  Private
const getReturns = async (req, res, next) => {
  try {
    const { type, storeType, search, from, to } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (type && ['supplier', 'customer'].includes(type)) {
      filter.type = type;
    }

    if (storeType && ['medical', 'provision'].includes(storeType)) {
      filter.storeType = storeType;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filter.$or = [{ returnNo: regex }, { supplierName: regex }, { customerName: regex }, { creditNoteNo: regex }];
    }

    if (from || to) {
      filter.returnDate = {};
      if (from) filter.returnDate.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.returnDate.$lte = toDate;
      }
    }

    const total = await Return.countDocuments(filter);
    const returnsList = await Return.find(filter)
      .populate('itemId', 'name composition category unit hsnCode storeType')
      .populate({ path: 'batchId', select: 'batchNo expiryDate mrp purchaseRate supplierId', populate: { path: 'supplierId', select: 'name phone address' } })
      .populate('referenceBillId', 'billNo billDate totalAmount')
      .sort({ returnDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      data: returnsList,
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

// @desc    Get single Return record by ID
// @route   GET /api/returns/:id
// @access  Private
const getReturnById = async (req, res, next) => {
  try {
    const returnRecord = await Return.findById(req.params.id)
      .populate('itemId', 'name composition category unit hsnCode storeType')
      .populate({ path: 'batchId', select: 'batchNo expiryDate mrp purchaseRate supplierId', populate: { path: 'supplierId', select: 'name phone address' } })
      .populate('referenceBillId', 'billNo billDate totalAmount')
      .lean();

    if (!returnRecord) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Return record not found.' },
      });
    }

    return res.status(200).json({ data: returnRecord });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReturn,
  getReturns,
  getReturnById,
};
