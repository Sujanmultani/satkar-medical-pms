const crypto = require('crypto');
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
    const rawFiles = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (rawFiles.length === 0) {
      return res.status(400).json({
        error: { code: 'NO_FILE_UPLOADED', message: 'Please upload valid invoice image or PDF file(s).' },
      });
    }

    // Preprocess all uploaded image pages with sharp (EXIF auto-orientation, max 2000x2000 resize, JPEG quality 90)
    const processedPages = await Promise.all(
      rawFiles.map((file) => preprocessInvoiceImage(file.buffer, file.mimetype))
    );

    // Call Gemini multimodal invoice parser
    const parsedData = await parseInvoiceImageWithGemini(processedPages);

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

    const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.code === 429;
    if (isRateLimit) {
      return res.status(429).json({
        error: {
          code: 'GEMINI_RATE_LIMIT_EXHAUSTED',
          message: 'Google AI scanner is temporarily busy (429 Rate Limit). Please wait 10-15 seconds and try scanning again.',
        },
      });
    }

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
      force,
    } = req.body;
    const isPaid = paymentStatus === 'paid';

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_ITEMS', message: 'At least one line item is required to confirm invoice.' },
      });
    }

    // Duplicate invoice guard: block accidental double-scan of the same supplier invoice
    // unless the client explicitly confirms it's intentional (force: true).
    if (!force && supplierName && supplierName.trim() && invoiceNo && invoiceNo.trim()) {
      const escapedSupplier = supplierName.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedNo = invoiceNo.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');

      const dupInvoice = await Invoice.findOne({
        supplierName: { $regex: new RegExp(`^${escapedSupplier}$`, 'i') },
        invoiceNo: { $regex: new RegExp(`^${escapedNo}$`, 'i') },
      }).lean();

      if (dupInvoice) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_INVOICE',
            message: `Invoice "${invoiceNo.trim()}" from "${supplierName.trim()}" is already scanned & saved. Please confirm again only if this is genuinely a different invoice.`,
          },
          data: { existingInvoice: dupInvoice },
        });
      }
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

// @desc    Check if an invoice with the same supplier + invoice number already exists
// @route   GET /api/invoices/check-duplicate
// @access  Private
const checkDuplicateInvoice = async (req, res, next) => {
  try {
    const { supplierName, invoiceNo } = req.query;

    if (!supplierName || !supplierName.trim() || !invoiceNo || !invoiceNo.trim()) {
      return res.status(200).json({ data: { duplicate: false } });
    }

    const escapedSupplier = supplierName.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');
    const escapedNo = invoiceNo.trim().replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');

    const existing = await Invoice.findOne({
      supplierName: { $regex: new RegExp(`^${escapedSupplier}$`, 'i') },
      invoiceNo: { $regex: new RegExp(`^${escapedNo}$`, 'i') },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!existing) {
      return res.status(200).json({ data: { duplicate: false } });
    }

    return res.status(200).json({
      data: {
        duplicate: true,
        existingInvoice: {
          _id: existing._id,
          invoiceNo: existing.invoiceNo,
          supplierName: existing.supplierName,
          invoiceDate: existing.invoiceDate,
          totalAmount: existing.totalAmount,
          createdAt: existing.createdAt,
          itemCount: Array.isArray(existing.items) ? existing.items.length : 0,
        },
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

    // Fetch every referenced batch in ONE query instead of one findById per line item per
    // invoice (which was doing many individual database round-trips per search).
    const allBatchIds = [];
    invoices.forEach((inv) => {
      (inv.items || []).forEach((itemEntry) => {
        if (itemEntry.batchId) allBatchIds.push(itemEntry.batchId);
      });
    });

    const batchesById = {};
    if (allBatchIds.length > 0) {
      const batchDocs = await Batch.find({ _id: { $in: allBatchIds } })
        .populate('itemId', 'name composition category unit hsnCode location storeType')
        .lean();
      batchDocs.forEach((b) => {
        batchesById[b._id.toString()] = b;
      });
    }

    const populatedInvoices = invoices.map((inv) => ({
      ...inv,
      items: (inv.items || []).map((itemEntry) => ({
        ...itemEntry,
        batch: itemEntry.batchId ? (batchesById[itemEntry.batchId.toString()] || null) : null,
      })),
    }));

    return res.status(200).json({
      data: populatedInvoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice with optional stock rollback
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const rollbackStock = Boolean(
      req.body?.rollbackStock !== undefined ? req.body.rollbackStock : req.query?.rollbackStock
    );

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invoice record not found.' },
      });
    }

    const partialRollbackWarnings = [];
    let itemsRolledBackCount = 0;
    let itemsSkippedCount = 0;

    if (rollbackStock && Array.isArray(invoice.items)) {
      for (const item of invoice.items) {
        const extData = item.extractedData || {};
        const paidQty = Math.max(0, Number(extData.qty) || 0);
        const freeQty = Math.max(0, Number(extData.freeQty) || 0);
        const qtyToRemove = paidQty + freeQty;

        if (!item.batchId || qtyToRemove <= 0) {
          itemsSkippedCount++;
          continue;
        }

        const batch = await Batch.findById(item.batchId);
        if (!batch) {
          console.warn(`[Delete Invoice] Batch ${item.batchId} not found, skipping stock rollback for this item.`);
          itemsSkippedCount++;
          continue;
        }

        const itemName = extData.name || 'Medicine/Item';
        const batchNo = batch.batchNo || extData.batchNo || 'N/A';
        const currentQty = Number(batch.qty) || 0;
        const newQty = currentQty - qtyToRemove;

        if (newQty >= 0) {
          batch.qty = newQty;
          batch.initialQty = Math.max(0, (Number(batch.initialQty) || currentQty) - qtyToRemove);
        } else {
          // Stock already partially sold beyond what can be rolled back safely
          batch.qty = 0;
          batch.initialQty = 0;
          partialRollbackWarnings.push({
            batchId: batch._id,
            batchNo,
            itemName,
            attemptedRollback: qtyToRemove,
            availableBeforeDelete: currentQty,
            message: `Batch "${batchNo}" (${itemName}) had ${currentQty} units left in stock, but invoice added ${qtyToRemove} units. Stock clamped to 0 (${qtyToRemove - currentQty} already-sold units could not be reversed).`,
          });
        }

        if (batch.expiryDate) {
          batch.status = computeBatchStatus(batch.expiryDate);
        }
        await batch.save();
        itemsRolledBackCount++;
      }
    }

    await Invoice.findByIdAndDelete(id);

    return res.status(200).json({
      message: rollbackStock
        ? `Invoice ${invoice.invoiceNo} deleted and stock rolled back for ${itemsRolledBackCount} line item(s).`
        : `Invoice ${invoice.invoiceNo} deleted cleanly without modifying stock.`,
      rolledBack: Boolean(rollbackStock),
      itemsRolledBackCount,
      itemsSkippedCount,
      partialRollbackWarnings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or generate public share link for a scanned invoice (Authenticated)
// @route   GET /api/invoices/:id/share-link
// @access  Private
const getOrCreateInvoiceShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invoice not found.' },
      });
    }

    if (!invoice.shareToken) {
      invoice.shareToken = crypto.randomBytes(24).toString('hex');
      await invoice.save();
    }

    const baseUrl = process.env.CLIENT_URL || 'https://www.satkarmedico.in';
    const shareUrl = `${baseUrl.replace(/\/$/, '')}/shared-invoice/${invoice.shareToken}`;

    return res.status(200).json({
      data: {
        shareUrl,
        shareToken: invoice.shareToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public invoice details by share token (Public - No Auth)
// @route   GET /api/invoices/public/:token
// @access  Public
const getInvoiceByShareToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invoice not found or link expired.' },
      });
    }

    const invoice = await Invoice.findOne({ shareToken: token })
      .populate({
        path: 'items.batchId',
        select: 'batchNo expiryDate mrp purchaseRate gstPercent freeQty initialQty itemId',
        populate: { path: 'itemId', select: 'name composition category unit hsnCode storeType' },
      })
      .lean();

    if (!invoice) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Invoice not found or link expired.' },
      });
    }

    const publicInvoice = {
      _id: invoice._id,
      invoiceNo: invoice.invoiceNo,
      supplierName: invoice.supplierName,
      invoiceDate: invoice.invoiceDate,
      items: (invoice.items || []).map((it) => ({
        extractedData: it.extractedData,
        batch: it.batchId || null,
      })),
      gstBreakdown: invoice.gstBreakdown,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
    };

    return res.status(200).json({ data: publicInvoice });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanInvoice,
  confirmInvoice,
  searchInvoiceByNumber,
  checkDuplicateInvoice,
  deleteInvoice,
  getOrCreateInvoiceShareLink,
  getInvoiceByShareToken,
};
