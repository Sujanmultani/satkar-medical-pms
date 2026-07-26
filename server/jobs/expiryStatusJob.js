const cron = require('node-cron');
const Item = require('../models/Item');
const Batch = require('../models/Batch');
const { computeBatchStatus } = require('../utils/batchStatus');
const { sendExpiryDigestEmail } = require('../services/emailService');

/**
 * Bulk recalculates status for all batches and updates changed records.
 * @param {boolean} sendEmailDigest - If true, sends daily email digest of expiring/expired batches (qty > 0).
 */
const updateBatchExpiryStatuses = async (sendEmailDigest = false) => {
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

    // Only send email digest if sendEmailDigest === true (daily scheduled run or manual trigger)
    if (sendEmailDigest) {
      console.log('[Expiry Cron Job] Fetching active stock batches for daily expiry email digest...');
      const [expiringSoon, expired] = await Promise.all([
        Batch.find({ status: 'expiring_soon', qty: { $gt: 0 } }).populate('itemId', 'name storeType').lean(),
        Batch.find({ status: 'expired', qty: { $gt: 0 } }).populate('itemId', 'name storeType').lean(),
      ]);

      if (expiringSoon.length > 0 || expired.length > 0) {
        const emailResult = await sendExpiryDigestEmail({ expiringSoon, expired });
        return { bulkOpsCount: bulkOps.length, emailResult, counts: { expiringSoon: expiringSoon.length, expired: expired.length } };
      } else {
        console.log('[Expiry Cron Job] No active stock batches (qty > 0) currently expiring soon or expired. No email sent.');
        return { bulkOpsCount: bulkOps.length, skippedEmail: true, message: 'No expiring or expired items found in stock.' };
      }
    }

    return { bulkOpsCount: bulkOps.length };
  } catch (error) {
    console.error('[Expiry Cron Job Error]', error.message);
    return { error: error.message };
  }
};

/**
 * Starts cron schedule (daily at 01:00 AM) and runs initial check immediately.
 */
const startExpiryCron = () => {
  // Immediate run on startup: update DB status only, DO NOT send email digest
  updateBatchExpiryStatuses(false);

  // Scheduled daily run at 1:00 AM: update DB status AND send email digest
  cron.schedule('0 1 * * *', () => {
    console.log('[Expiry Cron Job] Triggered scheduled 1 AM expiry status check and daily email digest...');
    updateBatchExpiryStatuses(true);
  });
  console.log('[Expiry Cron Job] Scheduled daily 1:00 AM expiry cron job with email notifications (0 1 * * *).');
};

module.exports = {
  updateBatchExpiryStatuses,
  startExpiryCron,
};
