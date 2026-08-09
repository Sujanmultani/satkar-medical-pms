const Bill = require('../models/Bill');
const Batch = require('../models/Batch');
const Item = require('../models/Item');
const { roundMoney } = require('../utils/money');
const { computeBatchStatus } = require('../utils/batchStatus');
const crypto = require('crypto');

// Helper to generate unique readable bill number (INV-YYYYMMDD-XXXX)
const generateBillNumber = async (dateObj) => {
  const d = dateObj ? new Date(dateObj) : new Date();
  const dateStr = isNaN(d.getTime())
    ? new Date().toISOString().split('T')[0].replace(/-/g, '')
    : d.toISOString().split('T')[0].replace(/-/g, '');

  const regex = new RegExp(`^INV-${dateStr}-`);
  
  // Find highest existing sequence bill for this date
  const latestBill = await Bill.findOne({ billNo: regex })
    .sort({ billNo: -1 })
    .select('billNo')
    .lean();

  let nextSeq = 1;
  if (latestBill && latestBill.billNo) {
    const parts = latestBill.billNo.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }

  // Safety retry loop to ensure absolute uniqueness
  let candidateBillNo = `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
  let exists = await Bill.exists({ billNo: candidateBillNo });

  while (exists) {
    nextSeq++;
    candidateBillNo = `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;
    exists = await Bill.exists({ billNo: candidateBillNo });
  }

  return candidateBillNo;
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

      const lineBase = roundMoney(numQty * numRate);
      const lineGst = roundMoney((lineBase * numGst) / 100);

      subtotalAmount = roundMoney(subtotalAmount + lineBase);
      totalGstAmount = roundMoney(totalGstAmount + lineGst);

      batchUpdates.push({ batch, numQty });
    }

    // Step 2: Compute GST Breakdown & Totals using roundMoney at every step
    const cgst = roundMoney(totalGstAmount / 2);
    const sgst = roundMoney(totalGstAmount - cgst);
    const totalAmount = roundMoney(subtotalAmount + totalGstAmount);

    const billNo = await generateBillNumber(billDate);

    // Step 3: Create the bill FIRST, before touching stock. If bill creation fails
    // (e.g. a rare billNo collision under concurrent requests), stock is left
    // completely untouched instead of being silently decremented with no matching
    // bill record.
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

    // Step 4: Decrement batch stock now that the bill exists. If this fails partway,
    // delete the bill we just created so a bill never exists without matching stock
    // having actually been deducted.
    try {
      for (const { batch, numQty } of batchUpdates) {
        batch.qty -= numQty;
        await batch.save();
      }
    } catch (stockError) {
      await Bill.findByIdAndDelete(bill._id).catch(() => {});
      throw stockError;
    }

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
const Return = require('../models/Return');

// Helper to attach customer return metadata (returnedQty, isReturned, maxReturnableQty, isFullyReturned)
const attachReturnInfoToBills = async (bills) => {
  if (!bills || bills.length === 0) return [];

  const billIds = bills.map((b) => b._id);
  const returns = await Return.find({
    type: 'customer',
    referenceBillId: { $in: billIds },
  }).lean();

  const returnsByBillMap = {};
  returns.forEach((r) => {
    if (!r.referenceBillId) return;
    const key = r.referenceBillId.toString();
    if (!returnsByBillMap[key]) {
      returnsByBillMap[key] = [];
    }
    returnsByBillMap[key].push(r);
  });

  return bills.map((b) => {
    const billReturns = returnsByBillMap[b._id.toString()] || [];

    let totalBillQty = 0;
    let totalReturnedQty = 0;

    const itemsWithReturnStatus = (b.items || []).map((lineItem) => {
      const lineBatchId = lineItem.batchId?._id ? lineItem.batchId._id.toString() : lineItem.batchId?.toString();
      const lineItemId = lineItem.itemId?._id ? lineItem.itemId._id.toString() : lineItem.itemId?.toString();

      const lineReturns = billReturns.filter((r) => {
        const rBatchId = r.batchId ? r.batchId.toString() : null;
        const rItemId = r.itemId ? r.itemId.toString() : null;
        return (lineBatchId && rBatchId === lineBatchId) || (lineItemId && rItemId === lineItemId);
      });

      const returnedQty = lineReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);
      const isReturned = (lineItem.qty || 0) > 0 && returnedQty >= lineItem.qty;

      totalBillQty += lineItem.qty || 0;
      totalReturnedQty += returnedQty;

      return {
        ...lineItem,
        returnedQty,
        isReturned,
        maxReturnableQty: Math.max(0, (lineItem.qty || 0) - returnedQty),
      };
    });

    const isFullyReturned = totalBillQty > 0 && totalReturnedQty >= totalBillQty;
    const isPartiallyReturned = totalReturnedQty > 0 && !isFullyReturned;

    return {
      ...b,
      items: itemsWithReturnStatus,
      returns: billReturns,
      totalReturnedQty,
      isFullyReturned,
      isPartiallyReturned,
    };
  });
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

    const populatedBills = await attachReturnInfoToBills(bills);

    return res.status(200).json({
      data: populatedBills,
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

    const [populatedBill] = await attachReturnInfoToBills([bill]);

    return res.status(200).json({ data: populatedBill });
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

// @desc    Track WhatsApp/SMS sharing status
// @route   POST /api/bills/:id/share
// @access  Private
const shareBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { channel = 'whatsapp' } = req.body || {};

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found.' },
      });
    }

    if (!bill.shareStatus) {
      bill.shareStatus = { whatsapp: false, sms: false, printed: false };
    }

    if (channel === 'whatsapp') {
      bill.shareStatus.whatsapp = true;
    } else if (channel === 'sms') {
      bill.shareStatus.sms = true;
    }

    await bill.save();

    return res.status(200).json({ data: bill });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bill (with option to restore or skip stock restoration)
// @route   DELETE /api/bills/:id
// @access  Private
const deleteBill = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Accept restock from body or query (default to false if not specified)
    const restock = req.body?.restock === true || req.query?.restock === 'true';

    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found.' },
      });
    }

    let restoredItemsCount = 0;
    const skippedItems = [];

    if (restock) {
      for (const lineItem of bill.items || []) {
        if (!lineItem.batchId) continue;
        const batchId = lineItem.batchId._id ? lineItem.batchId._id : lineItem.batchId;
        const qtyToRestore = Number(lineItem.qty) || 0;

        if (qtyToRestore <= 0) continue;

        const batch = await Batch.findById(batchId);
        if (!batch) {
          skippedItems.push({
            batchId: String(batchId),
            reason: 'Batch record no longer exists in database.',
          });
          console.warn(`[Delete Bill Warning] Batch ${batchId} not found for stock restoration.`);
          continue;
        }

        batch.qty += qtyToRestore;
        if (batch.expiryDate) {
          batch.status = computeBatchStatus(batch.expiryDate);
        }
        await batch.save();
        restoredItemsCount++;
      }
    }

    await Bill.findByIdAndDelete(id);

    return res.status(200).json({
      message: restock
        ? `Bill ${bill.billNo} deleted and stock restored for ${restoredItemsCount} line item(s).`
        : `Bill ${bill.billNo} deleted cleanly without modifying stock.`,
      restocked: Boolean(restock),
      restoredItemsCount,
      skippedItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or generate public share link for a bill (Authenticated)
// @route   GET /api/bills/:id/share-link
// @access  Private
const getOrCreateShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found.' },
      });
    }

    if (!bill.shareToken) {
      bill.shareToken = crypto.randomBytes(24).toString('hex');
      await bill.save();
    }

    const baseUrl = process.env.CLIENT_URL || 'https://www.satkarmedico.in';
    const shareUrl = `${baseUrl.replace(/\/$/, '')}/shared-bill/${bill.shareToken}`;

    return res.status(200).json({
      data: {
        shareUrl,
        shareToken: bill.shareToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public bill details by share token (Public - No Auth)
// @route   GET /api/bills/public/:token
// @access  Public
const getBillByShareToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found or link expired.' },
      });
    }

    const bill = await Bill.findOne({ shareToken: token })
      .populate('items.itemId', 'name composition category unit hsnCode storeType')
      .populate('items.batchId', 'batchNo expiryDate mrp')
      .lean();

    if (!bill) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Bill not found or link expired.' },
      });
    }

    const publicBill = {
      _id: bill._id,
      billNo: bill.billNo,
      billDate: bill.billDate,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      items: bill.items,
      gstBreakdown: bill.gstBreakdown,
      totalAmount: bill.totalAmount,
      paymentMode: bill.paymentMode,
    };

    return res.status(200).json({ data: publicBill });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBill,
  getBills,
  getBillById,
  markPrinted,
  shareBill,
  deleteBill,
  getOrCreateShareLink,
  getBillByShareToken,
};
