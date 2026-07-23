const Item = require('../models/Item');
const Batch = require('../models/Batch');

// @desc    Get dashboard summary statistics
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const totalItems = await Item.countDocuments();
    
    const batches = await Batch.find({}).select('qty status').lean();
    
    let totalBatchQty = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    batches.forEach((b) => {
      totalBatchQty += b.qty || 0;
      if (b.status === 'expiring_soon') expiringSoonCount++;
      if (b.status === 'expired') expiredCount++;
    });

    return res.status(200).json({
      totalItems,
      totalBatchQty,
      todaySales: 0, // Phase 6 will populate today's sales from Bill collection
      expiringSoonCount,
      expiredCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};
