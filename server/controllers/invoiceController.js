const { parseInvoiceImageWithGemini } = require('../services/invoiceParser');
const { findOrCreateSupplier } = require('../services/supplierService');
const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
const { computeBatchStatus } = require('../utils/batchStatus');

// @desc    Scan invoice image using Gemini (Vertex AI Multimodal)
// @route   POST /api/invoices/scan
// @access  Private
const scanInvoice = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: { code: 'NO_FILE_UPLOADED', message: 'Please upload a valid invoice image file.' },
      });
    }

    // Call Gemini multimodal invoice parser
    const parsedData = await parseInvoiceImageWithGemini(req.file.buffer, req.file.mimetype);

    // Auto-fill composition from known items in database
    const targetStore = ['medical', 'provision'].includes(req.body.storeType) ? req.body.storeType : 'medical';

    try {
      const existingItems = await Item.find({
        storeType: targetStore,
        composition: { $exists: true, $ne: '' },
      })
        .select('name composition')
        .lean();

      if (existingItems.length > 0) {
        const itemMap = new Map();
        existingItems.forEach((i) => {
          if (i.name && i.composition) {
            const key = i.name.trim().toLowerCase().replace(/\s+/g, ' ');
            if (!itemMap.has(key)) {
              itemMap.set(key, i.composition.trim());
            }
          }
        });

        parsedData.items = (parsedData.items || []).map((item) => {
          if (!item.composition || !item.composition.trim()) {
            const itemKey = (item.name || '').trim().toLowerCase().replace(/\s+/g, ' ');

            // Exact normalized name match
            if (itemKey && itemMap.has(itemKey)) {
              return {
                ...item,
                composition: itemMap.get(itemKey),
                compositionSource: 'auto-filled',
              };
            }

            // Substring / partial match
            const matched = existingItems.find((ex) => {
              if (!ex.name) return false;
              const exKey = ex.name.trim().toLowerCase().replace(/\s+/g, ' ');
              return exKey.length >= 3 && itemKey.length >= 3 && (exKey.includes(itemKey) || itemKey.includes(exKey));
            });

            if (matched) {
              return {
                ...item,
                composition: matched.composition.trim(),
                compositionSource: 'auto-filled',
              };
            }
          }
          return item;
        });
      }
    } catch (dbErr) {
      console.warn('[Auto-fill Warning] Failed to lookup existing item compositions:', dbErr.message);
    }

    return res.status(200).json({
      rawText: 'Gemini Multimodal Structured Extraction',
      supplierName: parsedData.supplierName,
      invoiceNo: parsedData.invoiceNo,
      invoiceDate: parsedData.invoiceDate,
      items: parsedData.items,
    });
  } catch (error) {
    console.error('[Invoice Gemini Scan Error]', error);
    return res.status(500).json({
      error: {
        code: 'OCR_SCAN_FAILED',
        message: 'Could not read this invoice — please enter items manually.',
      },
    });
  }
};

// @desc    Confirm extracted invoice data & create Items and Batches in DB
// @route   POST /api/invoices/confirm
// @access  Private
const confirmInvoice = async (req, res, next) => {
  try {
    const { supplierName, invoiceNo, invoiceDate, storeType = 'medical', items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_ITEMS', message: 'At least one line item is required to confirm invoice.' },
      });
    }

    let createdItemsCount = 0;
    let createdBatchesCount = 0;
    let totalInvoiceAmount = 0;
    const invoiceItemsPayload = [];

    let supplierRecord = null;
    if (supplierName && supplierName.trim()) {
      supplierRecord = await findOrCreateSupplier({ name: supplierName.trim() });
    }

    for (const lineItem of items) {
      const { name, composition, category, unit, hsnCode, batchNo, expiryDate, qty, purchaseRate, mrp, gstPercent } = lineItem;

      if (!name || !name.trim()) continue;
      if (!batchNo || !batchNo.trim()) continue;
      if (!expiryDate) continue;

      const itemNameClean = name.trim();
      const store = ['medical', 'provision'].includes(storeType) ? storeType : 'medical';

      // Check if Item exists (case-insensitive regex match within same storeType)
      let item = await Item.findOne({
        name: { $regex: new RegExp(`^${itemNameClean.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
        storeType: store,
      });

      if (!item) {
        item = await Item.create({
          storeType: store,
          name: itemNameClean,
          composition: composition ? composition.trim() : '',
          category: category ? category.trim() : (store === 'medical' ? 'Tablet / Medicine' : 'General'),
          unit: unit ? unit.trim() : (store === 'medical' ? 'strip' : 'piece'),
          hsnCode: hsnCode ? hsnCode.trim() : '',
        });
        createdItemsCount++;
      } else {
        // Update composition if missing
        if (!item.composition && composition) {
          item.composition = composition.trim();
          await item.save();
        }
      }

      const numQty = Math.max(0, Number(qty) || 0);
      const numPurchaseRate = Math.max(0, Number(purchaseRate) || 0);
      const numMrp = Math.max(0, Number(mrp) || 0);
      const numGstPercent = Math.max(0, Number(gstPercent) || 0);

      // Create Batch
      const batch = await Batch.create({
        itemId: item._id,
        supplierId: supplierRecord ? supplierRecord._id : undefined,
        batchNo: batchNo.trim(),
        expiryDate: new Date(expiryDate),
        qty: numQty,
        purchaseRate: numPurchaseRate,
        mrp: numMrp,
        gstPercent: numGstPercent,
        status: computeBatchStatus(expiryDate),
        paymentStatus: 'pending',
        amountDue: numQty * numPurchaseRate,
      });

      createdBatchesCount++;
      const lineTotal = numQty * numPurchaseRate;
      totalInvoiceAmount += lineTotal;

      invoiceItemsPayload.push({
        batchId: batch._id,
        extractedData: lineItem,
      });
    }

    // Save Invoice Record
    const invoiceRecord = await Invoice.create({
      supplierName: supplierName ? supplierName.trim() : 'Unspecified Supplier',
      invoiceNo: invoiceNo ? invoiceNo.trim() : `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      items: invoiceItemsPayload,
      totalAmount: Math.round(totalInvoiceAmount * 100) / 100,
      status: 'confirmed',
    });

    return res.status(201).json({
      data: {
        invoice: invoiceRecord,
        createdItemsCount,
        createdBatchesCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanInvoice,
  confirmInvoice,
};
