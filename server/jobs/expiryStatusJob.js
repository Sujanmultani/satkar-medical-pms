const cron = require('node-cron');
const Batch = require('../models/Batch');
const { computeBatchStatus } = require('../utils/batchStatus');

/**
 * Bulk recalculates status for all batches and updates changed records.
 */
const updateBatchExpiryStatuses = async () => {
  try {
    const batches = await Batch.find({}).select('_id expiryDate status').lean();
    const bulkOps = [];
    let movedToExpiring = 0;
    let movedToExpired = 0;
    let movedToActive = 0;

    for (const b of batches) {
      const newStatus = computeBatchStatus(b.expiryDate);
      if (newStatus !== b.status) {
        if (newStatus === 'expiring_soon') movedToExpiring++;
        else if (newStatus === 'expired') movedToExpired++;
        else if (newStatus === 'active') movedToActive++;

        bulkOps.push({
          updateOne: {
            filter: { _id: b._id },
            update: { $set: { status: newStatus } },
          },
        });
      }
    }

    if (bulkOps.length > 0) {
      await Batch.bulkWrite(bulkOps);
    }

    console.log(
      `[Expiry Cron Job] Expiry check complete: ${bulkOps.length} batches updated (${movedToExpiring} -> expiring_soon, ${movedToExpired} -> expired, ${movedToActive} -> active).`
    );
  } catch (error) {
    console.error('[Expiry Cron Job Error]', error.message);
  }
};

/**
 * Starts cron schedule (daily at 01:00 AM) and runs initial check immediately.
 */
const startExpiryCron = () => {
  // Immediate run on startup
  updateBatchExpiryStatuses();

  // Schedule daily at 1:00 AM
  cron.schedule('0 1 * * *', () => {
    console.log('[Expiry Cron Job] Triggered scheduled 1 AM expiry status check...');
    updateBatchExpiryStatuses();
  });
};

module.exports = {
  updateBatchExpiryStatuses,
  startExpiryCron,
};
