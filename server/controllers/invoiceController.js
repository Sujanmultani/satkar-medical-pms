const { parseInvoiceImageWithGemini, preprocessInvoiceImage } = require('../services/invoiceParser');
const { findOrCreateSupplier } = require('../services/supplierService');
const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
const { computeBatchStatus } = require('../utils/batchStatus');
const { roundMoney } = require('../utils/money');

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

    // Preprocess image with sharp (EXIF auto-orientation, max 2000x2000 resize, JPEG quality 90)
    const { buffer: processedBuffer, mimeType: processedMimeType } = await preprocessInvoiceImage(
      req.file.buffer,
      req.file.mimetype
    );

    // Call Gemini multimodal invoice parser
    const parsedData = await parseInvoiceImageWithGemini(processedBuffer, processedMimeType);

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
      printedSubtotal: parsedData.printedSubtotal,
      printedRoundOff: parsedData.printedRoundOff,
      printedGrandTotal: parsedData.printedGrandTotal,
      items: parsedData.items,
      possibleMissingItems: Boolean(parsedData.possibleMissingItems),
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
    const {
      supplierName,
      invoiceNo,
      invoiceDate,
      printedSubtotal,
      printedRoundOff,
      printedGrandTotal,
      storeType = 'medical',
      paymentStatus = 'pending',
      items,
    } = req.body;
    const isPaid = paymentStatus === 'paid';

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_ITEMS', message: 'At least one line item is required to confirm invoice.' },
      });
    }

    let createdItemsCount = 0;
    let createdBatchesCount = 0;
    let totalBaseAmount = 0;
    let totalInvoiceGst = 0;
    const invoiceItemsPayload = [];

    let supplierRecord = null;
    if (supplierName && supplierName.trim()) {
      supplierRecord = await findOrCreateSupplier({ name: supplierName.trim() });
    }

    const store = ['medical', 'provision'].includes(storeType) ? storeType : 'medical';

    for (const lineItem of items) {
      const { name, composition, category, unit, hsnCode, location, batchNo, expiryDate, qty, freeQty, purchaseRate, mrp, gstPercent, discPercent } = lineItem;

      if (!name || !name.trim()) continue;
      if (!batchNo || !batchNo.trim()) continue;

      // Expiry Date is mandatory ONLY for medical store
      if (store === 'medical' && !expiryDate) continue;

      const itemNameClean = name.trim();

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
          location: location ? location.trim() : '',
        });
        createdItemsCount++;
      } else {
        let updated = false;
        if (!item.composition && composition) {
          item.composition = composition.trim();
          updated = true;
        }
        if (!item.hsnCode && hsnCode) {
          item.hsnCode = hsnCode.trim();
          updated = true;
        }
        if (!item.location && location) {
          item.location = location.trim();
          updated = true;
        }
        if (updated) {
          await item.save();
        }
      }

      const numQty = Math.max(0, Number(qty) || 0);
      const numFreeQty = Math.max(0, Number(freeQty) || 0);
      const numPurchaseRate = Math.max(0, Number(purchaseRate) || 0);
      const numMrp = Math.max(0, Number(mrp) || 0);
      const numGstPercent = Math.max(0, Number(gstPercent) || 0);
      const numDiscPercent = Math.max(0, Number(discPercent) || 0);

      const batchExpiry = expiryDate ? new Date(expiryDate) : null;
      const batchStatus = batchExpiry ? computeBatchStatus(batchExpiry) : 'active';
      const lineBase = roundMoney(numQty * numPurchaseRate);
      const lineGst = roundMoney((lineBase * numGstPercent) / 100);

      // Create Batch (physical stock includes paid + free units; cost uses paid qty only)
      const batch = await Batch.create({
        itemId: item._id,
        supplierId: supplierRecord ? supplierRecord._id : undefined,
        batchNo: batchNo.trim(),
        mfgDate: lineItem.mfgDate ? new Date(lineItem.mfgDate) : null,
        expiryDate: batchExpiry,
        receivedDate: invoiceDate ? new Date(invoiceDate) : new Date(),
        qty: numQty + numFreeQty,
        initialQty: numQty + numFreeQty,
        freeQty: numFreeQty,
        purchaseRate: numPurchaseRate,
        mrp: numMrp,
        gstPercent: numGstPercent,
        discPercent: numDiscPercent,
        status: batchStatus,
        paymentStatus: isPaid ? 'paid' : 'pending',
        amountDue: isPaid ? 0 : lineBase,
      });

      createdBatchesCount++;
      totalBaseAmount = roundMoney(totalBaseAmount + lineBase);
      totalInvoiceGst = roundMoney(totalInvoiceGst + lineGst);

      invoiceItemsPayload.push({
        batchId: batch._id,
        extractedData: lineItem,
      });
    }

    const totalCgst = roundMoney(totalInvoiceGst / 2);
    const totalSgst = roundMoney(totalInvoiceGst - totalCgst);
    const calculatedAmount = roundMoney(totalBaseAmount + totalInvoiceGst);

    const validPrintedGrandTotal =
      typeof printedGrandTotal === 'number' && !isNaN(printedGrandTotal) && printedGrandTotal > 0
        ? roundMoney(printedGrandTotal)
        : null;

    const validRoundOff =
      typeof printedRoundOff === 'number' && !isNaN(printedRoundOff) ? printedRoundOff : 0;

    // Ground truth: use the actual printed total on the invoice whenever OCR read it.
    // Only fall back to the internally computed sum if the printed total wasn't captured.
    const totalAmount = validPrintedGrandTotal !== null
      ? validPrintedGrandTotal
      : roundMoney(calculatedAmount + validRoundOff);

    const amountMismatch = roundMoney(totalAmount - calculatedAmount);

    // Save Invoice Record
    const invoiceRecord = await Invoice.create({
      supplierName: supplierName ? supplierName.trim() : 'Unspecified Supplier',
      invoiceNo: invoiceNo ? invoiceNo.trim() : `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      items: invoiceItemsPayload,
      totalAmount,
      calculatedAmount,
      amountMismatch,
      printedSubtotal: typeof printedSubtotal === 'number' ? printedSubtotal : null,
      printedRoundOff: typeof printedRoundOff === 'number' ? printedRoundOff : null,
      printedGrandTotal: typeof printedGrandTotal === 'number' ? printedGrandTotal : null,
      gstBreakdown: {
        cgst: totalCgst,
        sgst: totalSgst,
        totalGst: totalInvoiceGst,
      },
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

// @desc    Search invoice by invoice number
// @route   GET /api/invoices/search
// @access  Private
const searchInvoiceByNumber = async (req, res, next) => {
  try {
    const { invoiceNo } = req.query;

    if (!invoiceNo || !invoiceNo.trim()) {
      return res.status(400).json({
        error: { code: 'MISSING_INVOICE_NO', message: 'Invoice number query parameter is required.' },
      });
    }

    const escapedNo = invoiceNo.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
    const invoices = await Invoice.find({
      invoiceNo: { $regex: new RegExp(escapedNo, 'i') },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        error: { code: 'INVOICE_NOT_FOUND', message: `No invoice found matching "${invoiceNo.trim()}".` },
      });
    }

    const populatedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        const itemsWithDetails = await Promise.all(
          (inv.items || []).map(async (itemEntry) => {
            let batchDetails = null;
            if (itemEntry.batchId) {
              batchDetails = await Batch.findById(itemEntry.batchId)
                .populate('itemId', 'name composition category unit hsnCode location storeType')
                .lean();
            }
            return {
              ...itemEntry,
              batch: batchDetails,
            };
          })
        );
        return {
          ...inv,
          items: itemsWithDetails,
        };
      })
    );

    return res.status(200).json({
      data: populatedInvoices,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanInvoice,
  confirmInvoice,
  searchInvoiceByNumber,
};
