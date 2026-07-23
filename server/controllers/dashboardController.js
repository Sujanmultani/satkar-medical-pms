const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Bill = require('../models/Bill');

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

    // Today's Sales Calculation
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayBills = await Bill.find({
      billDate: { $gte: startOfDay, $lte: endOfDay },
    }).select('totalAmount').lean();

    const todaySales = todayBills.reduce((acc, bill) => acc + (bill.totalAmount || 0), 0);

    return res.status(200).json({
      totalItems,
      totalBatchQty,
      todaySales: Math.round(todaySales * 100) / 100,
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
