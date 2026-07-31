const { runQuarterlyBackup } = require('../jobs/quarterlyBackupJob');
const { updateBatchExpiryStatuses } = require('../jobs/expiryStatusJob');

// @desc    Trigger manual database backup & email
// @route   POST /api/admin/trigger-backup
// @access  Private (Admin)
const triggerManualBackup = async (req, res, next) => {
  try {
    const result = await runQuarterlyBackup();
    if (!result.success) {
      return res.status(500).json({
        error: { code: 'BACKUP_FAILED', message: result.error || 'Failed to generate database backup.' },
        emailStatus: result.emailResult || null,
        data: result,
      });
    }

    return res.status(200).json({
      message: 'Database backup successfully generated and processed.',
      emailStatus: result.emailResult || null,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger manual expiry status update & send email digest on demand
// @route   POST /api/admin/trigger-expiry-email
// @access  Private (Admin)
const triggerManualExpiryEmail = async (req, res, next) => {
  try {
    const result = await updateBatchExpiryStatuses(true);
    return res.status(200).json({
      message: 'Expiry status check and email digest completed.',
      emailStatus: result.emailResult || null,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Invoice = require('../models/Invoice');
const Bill = require('../models/Bill');
const Return = require('../models/Return');
const Supplier = require('../models/Supplier');

// @desc    Clear all test data from MongoDB Atlas while preserving Admin User & Settings
// @route   POST /api/admin/clear-all-data
// @access  Private (Admin)
const clearAllData = async (req, res, next) => {
  try {
    const resItems = await Item.deleteMany({});
    const resBatches = await Batch.deleteMany({});
    const resInvoices = await Invoice.deleteMany({});
    const resBills = await Bill.deleteMany({});
    const resReturns = await Return.deleteMany({});
    const resSuppliers = await Supplier.deleteMany({});

    return res.status(200).json({
      message: 'All database test data wiped cleanly & successfully!',
      summary: {
        deletedItems: resItems.deletedCount,
        deletedBatches: resBatches.deletedCount,
        deletedInvoices: resInvoices.deletedCount,
        deletedBills: resBills.deletedCount,
        deletedReturns: resReturns.deletedCount,
        deletedSuppliers: resSuppliers.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerManualBackup,
  triggerManualExpiryEmail,
  clearAllData,
};
