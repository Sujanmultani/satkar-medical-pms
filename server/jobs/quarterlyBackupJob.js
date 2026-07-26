const cron = require('node-cron');
const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Bill = require('../models/Bill');
const Return = require('../models/Return');
const Supplier = require('../models/Supplier');
const Invoice = require('../models/Invoice');
const Settings = require('../models/Settings');
const { sendBackupEmail } = require('../services/emailService');

/**
 * Performs database export of all business collections to in-memory JSON buffer and sends backup email.
 */
const runQuarterlyBackup = async () => {
  console.log('[Quarterly Backup Job] Starting automated database export...');
  try {
    const exportDate = new Date().toISOString();

    // Query all business collections (excluding User credentials for security)
    const [items, batches, bills, returns, suppliers, invoices, settings] = await Promise.all([
      Item.find({}).lean(),
      Batch.find({}).lean(),
      Bill.find({}).lean(),
      Return.find({}).lean(),
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

    const backupPayload = {
      system: 'Satkar Medical Pharmacy Management System',
      version: '1.0',
      exportDate,
      counts,
      data: {
        items,
        batches,
        bills,
        returns,
        suppliers,
        invoices,
        settings,
      },
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf-8');

    console.log(`[Quarterly Backup Job] Export generated: ${jsonBuffer.length} bytes across ${items.length} items, ${batches.length} batches, ${bills.length} bills.`);

    const emailResult = await sendBackupEmail(jsonBuffer, exportDate, counts);

    return {
      success: true,
      exportDate,
      sizeBytes: jsonBuffer.length,
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
