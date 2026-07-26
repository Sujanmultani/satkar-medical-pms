const { runQuarterlyBackup } = require('../jobs/quarterlyBackupJob');

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

module.exports = {
  triggerManualBackup,
};
