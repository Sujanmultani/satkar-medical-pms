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
      });
    }

    return res.status(200).json({
      message: 'Database backup successfully generated and processed.',
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
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  triggerManualBackup,
  triggerManualExpiryEmail,
};
