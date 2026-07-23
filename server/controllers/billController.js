const Bill = require('../models/Bill');
const Batch = require('../models/Batch');
const Item = require('../models/Item');

// Helper to generate unique readable bill number (INV-YYYYMMDD-XXXX)
const generateBillNumber = async (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
  
  // Count bills created today for 4-digit sequence padding
  const startOfDay = new Date(d);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);

  const countToday = await Bill.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = String(countToday + 1).padStart(4, '0');
  return `INV-${dateStr}-${sequence}`;
};

// @desc    Create new sale bill & decrement batch stock
// @route   POST /api/bills
// @access  Private
const createBill = async (req, res, next) => {
  try {
    const { billDate, customerName, customerPhone, items, paymentMode } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_ITEMS', message: 'At least one line item is required to generate a bill.' },
      });
    }

    if (!billDate) {
      return res.status(400).json({
        error: { code: 'MISSING_DATE', message: 'Bill date is required.' },
      });
    }

    // Step 1: Validate batch stock for all items before making changes
    const batchUpdates = [];
    let subtotalAmount = 0;
    let totalGstAmount = 0;

    for (const lineItem of items) {
      const { itemId, batchId, qty, rate, gst } = lineItem;
      const numQty = Number(qty);
      const numRate = Number(rate) || 0;
      const numGst = Number(gst) || 0;

      if (!itemId || !batchId || !numQty || numQty < 1) {
        return res.status(400).json({
          error: { code: 'INVALID_LINE_ITEM', message: 'Each line item must have valid itemId, batchId, and positive quantity.' },
        });
      }

      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(400).json({
          error: { code: 'NOT_FOUND', message: 'Referenced batch not found.' },
        });
      }

      if (batch.qty < numQty) {
        const itemObj = await Item.findById(itemId).select('name').lean();
        const itemName = itemObj ? itemObj.name : 'Selected Item';
        return res.status(400).json({
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for "${itemName}" (Batch: ${batch.batchNo}). Available: ${batch.qty}, Requested: ${numQty}.`,
          },
        });
      }

      const lineTotal = numQty * numRate;
      const lineGst = (lineTotal * numGst) / 100;

      subtotalAmount += lineTotal;
      totalGstAmount += lineGst;

      batchUpdates.push({ batch, numQty });
    }

    // Step 2: Decrement batch stock
    for (const { batch, numQty } of batchUpdates) {
      batch.qty -= numQty;
      await batch.save();
    }

    // Step 3: Compute GST Breakdown & Totals
    const cgst = Math.round((totalGstAmount / 2) * 100) / 100;
    const sgst = Math.round((totalGstAmount / 2) * 100) / 100;
    const totalAmount = Math.round((subtotalAmount + totalGstAmount) * 100) / 100;

    const billNo = await generateBillNumber(billDate);

    const bill = await Bill.create({
      billNo,
      billDate: new Date(billDate),
      customerName: customerName ? customerName.trim() : '',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      items,
      gstBreakdown: {
        subtotal: Math.round(subtotalAmount * 100) / 100,
        cgst,
        sgst,
        totalGst: Math.round(totalGstAmount * 100) / 100,
      },
      totalAmount,
      paymentMode: paymentMode || 'Cash',
      shareStatus: { whatsapp: false, sms: false, printed: false },
    });

    const populatedBill = await Bill.findById(bill._id)
      .populate('items.itemId', 'name composition category unit hsnCode storeType')
      .populate('items.batchId', 'batchNo expiryDate mrp')
      .lean();

    return res.status(201).json({ data: populatedBill });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bills (searchable & filterable by date range)
// @route   GET /api/bills
// @access  Private
const getBills = async (req, res, next) => {
  try {
    const { search, from, to } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filter.$or = [{ billNo: regex }, { customerName: regex }, { customerPhone: regex }];
    }

    if (from || to) {
      filter.billDate = {};
      if (from) filter.billDate.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.billDate.$lte = toDate;
      }
    }

    const total = await Bill.countDocuments(filter);
    const bills = await Bill.find(filter)
      .populate('items.itemId', 'name composition category unit hsnCode storeType')
      .populate('items.batchId', 'batchNo expiryDate mrp')
      .sort({ billDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(200).json({
      data: bills,
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

// @desc    Get single bill by ID
// @route   GET /api/bills/:id
// @access  Private
const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('items.itemId', 'name composition category unit hsnCode storeType')
      .populate('items.batchId', 'batchNo expiryDate mrp')
      .lean();

    if (!bill) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found.' },
      });
    }

    return res.status(200).json({ data: bill });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark bill as printed
// @route   PATCH /api/bills/:id/mark-printed
// @access  Private
const markPrinted = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found.' },
      });
    }

    bill.shareStatus.printed = true;
    await bill.save();

    return res.status(200).json({ data: bill });
  } catch (error) {
    next(error);
  }
};

// @desc    WhatsApp/SMS sharing stub
// @route   POST /api/bills/:id/share
// @access  Private
const shareBillStub = async (req, res) => {
  return res.status(501).json({
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Bill sharing via WhatsApp/SMS is coming in Phase 6.5.',
    },
  });
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  markPrinted,
  shareBillStub,
};
