const cron = require('node-cron');
const ExcelJS = require('exceljs');
const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Bill = require('../models/Bill');
const Return = require('../models/Return');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const Settings = require('../models/Settings');
const { sendBackupEmail } = require('../services/emailService');

/**
 * Performs database export of all business collections to Excel workbook (.xlsx) and sends backup email.
 */
const runQuarterlyBackup = async () => {
  console.log('[Quarterly Backup Job] Starting automated Excel database export...');
  try {
    const exportDate = new Date().toISOString();

    // Query all business collections (excluding User credentials for security)
    const [items, batches, bills, returns, suppliers, invoices, settings] = await Promise.all([
      Item.find({}).lean(),
      Batch.find({}).populate('itemId', 'name').lean(),
      Bill.find({}).lean(),
      Return.find({}).populate('itemId', 'name').lean(),
      Supplier.find({}).lean(),
      Invoice.find({}).lean(),
      Settings.find({}).lean(),
    ]);

    const counts = {
      items: items.length,
      batches: batches.length,
      bills: bills.length,
      returns: returns.length,
      suppliers: suppliers.length,
      invoices: invoices.length,
      settings: settings.length,
    };

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Satkar Medical PMS';
    workbook.created = new Date();

    // Sheet 1: Items
    const itemsSheet = workbook.addWorksheet('Items');
    itemsSheet.columns = [
      { header: 'Item ID', key: '_id', width: 25 },
      { header: 'Store Type', key: 'storeType', width: 12 },
      { header: 'Medicine / Item Name', key: 'name', width: 30 },
      { header: 'Composition / Salt', key: 'composition', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'HSN Code', key: 'hsnCode', width: 15 },
    ];
    items.forEach((item) => itemsSheet.addRow({ ...item, _id: item._id.toString() }));

    // Sheet 2: Batches
    const batchesSheet = workbook.addWorksheet('Batches');
    batchesSheet.columns = [
      { header: 'Batch ID', key: '_id', width: 25 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Batch No', key: 'batchNo', width: 15 },
      { header: 'Expiry Date', key: 'expiryDate', width: 15 },
      { header: 'Quantity', key: 'qty', width: 10 },
      { header: 'Purchase Rate (₹)', key: 'purchaseRate', width: 18 },
      { header: 'MRP (₹)', key: 'mrp', width: 12 },
      { header: 'GST %', key: 'gstPercent', width: 10 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Amount Due (₹)', key: 'amountDue', width: 15 },
    ];
    batches.forEach((b) =>
      batchesSheet.addRow({
        _id: b._id.toString(),
        itemName: b.itemId?.name || 'N/A',
        batchNo: b.batchNo,
        expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : '',
        qty: b.qty,
        purchaseRate: b.purchaseRate,
        mrp: b.mrp,
        gstPercent: b.gstPercent,
        status: b.status,
        paymentStatus: b.paymentStatus,
        amountDue: b.amountDue,
      })
    );

    // Sheet 3: Bills
    const billsSheet = workbook.addWorksheet('Bills');
    billsSheet.columns = [
      { header: 'Bill ID', key: '_id', width: 25 },
      { header: 'Bill Number', key: 'billNo', width: 20 },
      { header: 'Store Type', key: 'storeType', width: 12 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Customer Phone', key: 'customerPhone', width: 15 },
      { header: 'Bill Date', key: 'billDate', width: 15 },
      { header: 'Subtotal (₹)', key: 'subtotalAmount', width: 15 },
      { header: 'Total GST (₹)', key: 'totalGstAmount', width: 15 },
      { header: 'Grand Total (₹)', key: 'grandTotal', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    ];
    bills.forEach((b) =>
      billsSheet.addRow({
        _id: b._id.toString(),
        billNo: b.billNo,
        storeType: b.storeType,
        customerName: b.customerName || 'Walk-in Customer',
        customerPhone: b.customerPhone || '',
        billDate: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '',
        subtotalAmount: b.subtotalAmount,
        totalGstAmount: b.totalGstAmount,
        grandTotal: b.grandTotal,
        paymentMethod: b.paymentMethod,
      })
    );

    // Sheet 4: Returns
    const returnsSheet = workbook.addWorksheet('Returns');
    returnsSheet.columns = [
      { header: 'Return No', key: 'returnNo', width: 20 },
      { header: 'Return Type', key: 'type', width: 15 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Reason', key: 'reason', width: 18 },
      { header: 'Return Date', key: 'returnDate', width: 15 },
      { header: 'Restocked', key: 'restocked', width: 12 },
      { header: 'Supplier / Party', key: 'party', width: 25 },
      { header: 'Credit Note No', key: 'creditNoteNo', width: 18 },
      { header: 'Refund Amount (₹)', key: 'refundAmount', width: 18 },
    ];
    returns.forEach((r) =>
      returnsSheet.addRow({
        returnNo: r.returnNo,
        type: r.type,
        itemName: r.itemId?.name || 'N/A',
        quantity: r.quantity,
        reason: r.reason,
        returnDate: r.returnDate ? new Date(r.returnDate).toISOString().split('T')[0] : '',
        restocked: r.restocked ? 'Yes' : 'No',
        party: r.type === 'supplier' ? (r.supplierName || 'Supplier') : (r.customerName || 'Customer'),
        creditNoteNo: r.creditNoteNo || '',
        refundAmount: r.refundAmount || 0,
      })
    );

    // Sheet 5: Suppliers
    const suppliersSheet = workbook.addWorksheet('Suppliers');
    suppliersSheet.columns = [
      { header: 'Supplier ID', key: '_id', width: 25 },
      { header: 'Supplier Name', key: 'name', width: 30 },
      { header: 'Phone Number', key: 'phone', width: 15 },
      { header: 'Address', key: 'address', width: 35 },
    ];
    suppliers.forEach((s) => suppliersSheet.addRow({ ...s, _id: s._id.toString() }));

    // Sheet 6: Invoices
    const invoicesSheet = workbook.addWorksheet('Invoices');
    invoicesSheet.columns = [
      { header: 'Invoice Number', key: 'invoiceNo', width: 20 },
      { header: 'Supplier Name', key: 'supplierName', width: 30 },
      { header: 'Invoice Date', key: 'invoiceDate', width: 15 },
      { header: 'Printed Subtotal (₹)', key: 'printedSubtotal', width: 20 },
      { header: 'Printed Grand Total (₹)', key: 'printedGrandTotal', width: 20 },
      { header: 'Confirmed Total (₹)', key: 'totalAmount', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    invoices.forEach((inv) =>
      invoicesSheet.addRow({
        invoiceNo: inv.invoiceNo,
        supplierName: inv.supplierName,
        invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : '',
        printedSubtotal: inv.printedSubtotal || '',
        printedGrandTotal: inv.printedGrandTotal || '',
        totalAmount: inv.totalAmount,
        status: inv.status,
      })
    );

    // Sheet 7: Settings
    const settingsSheet = workbook.addWorksheet('Settings');
    settingsSheet.columns = [
      { header: 'Business Name', key: 'businessName', width: 30 },
      { header: 'GSTIN', key: 'gstin', width: 20 },
      { header: 'Address', key: 'address', width: 35 },
      { header: 'Phone', key: 'phone', width: 15 },
    ];
    settings.forEach((st) => settingsSheet.addRow(st));

    // Style Header Rows across all worksheets
    workbook.worksheets.forEach((ws) => {
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0B4C52' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    });

    const excelBuffer = await workbook.xlsx.writeBuffer();

    console.log(`[Quarterly Backup Job] Excel workbook generated: ${excelBuffer.length} bytes across 7 sheets.`);

    const emailResult = await sendBackupEmail(Buffer.from(excelBuffer), exportDate, counts, 'xlsx');

    return {
      success: true,
      exportDate,
      sizeBytes: excelBuffer.length,
      counts,
      emailResult,
    };
  } catch (error) {
    console.error('[Quarterly Backup Job Error] Backup failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Starts cron schedule for quarterly backup (2:00 AM on 1st of every 3rd month: Jan, Apr, Jul, Oct)
 */
const startQuarterlyBackupCron = () => {
  // Schedule: 0 2 1 */3 * (2:00 AM on the 1st of every 3rd month)
  cron.schedule('0 2 1 */3 *', async () => {
    console.log('[Quarterly Backup Cron] Triggered scheduled quarterly data backup...');
    await runQuarterlyBackup();
  });
  console.log('[Quarterly Backup Cron] Scheduled quarterly backup cron job (0 2 1 */3 *).');
};

module.exports = {
  runQuarterlyBackup,
  startQuarterlyBackupCron,
};
