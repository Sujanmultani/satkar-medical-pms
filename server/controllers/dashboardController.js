const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Bill = require('../models/Bill');
const Return = require('../models/Return');
const { roundMoney } = require('../utils/money');
const { computeBatchStatus } = require('../utils/batchStatus');

// @desc    Get dashboard summary statistics
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res, next) => {
  try {
    const totalItems = await Item.countDocuments();
    
    const batches = await Batch.find({}).select('qty status expiryDate').lean();
    
    let totalBatchQty = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;

    batches.forEach((b) => {
      totalBatchQty += b.qty || 0;
      // Exclude qty <= 0 batches from expiring_soon and expired counts (matching Expiry Alerts)
      if ((b.qty || 0) > 0) {
        const liveStatus = computeBatchStatus(b.expiryDate);
        if (liveStatus === 'expiring_soon') expiringSoonCount++;
        if (liveStatus === 'expired') expiredCount++;
      }
    });

    // Today's Date Range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayBills = await Bill.find({
      billDate: { $gte: startOfDay, $lte: endOfDay },
    }).select('grandTotal totalAmount').lean();

    const todayGrossSales = todayBills.reduce((acc, bill) => acc + (bill.grandTotal || bill.totalAmount || 0), 0);

    // Today's Customer Returns Refund Amount
    const todayCustomerReturns = await Return.find({
      type: 'customer',
      returnDate: { $gte: startOfDay, $lte: endOfDay },
    }).select('refundAmount').lean();

    const todayCustomerReturnRefunds = todayCustomerReturns.reduce((acc, ret) => acc + (ret.refundAmount || 0), 0);
    const todayNetSales = Math.max(0, roundMoney(todayGrossSales - todayCustomerReturnRefunds));

    // Overall Customer Returns Summary
    const customerReturns = await Return.find({ type: 'customer' }).select('refundAmount').lean();
    const customerReturnsCount = customerReturns.length;
    const customerReturnsAmount = roundMoney(customerReturns.reduce((acc, r) => acc + (r.refundAmount || 0), 0));

    // Overall Expired Supplier Returns Summary
    const expiredReturnsCount = await Return.countDocuments({ type: 'supplier', reason: 'expired' });

    return res.status(200).json({
      totalItems,
      totalBatchQty,
      todaySales: todayNetSales,
      todayGrossSales: roundMoney(todayGrossSales),
      todayCustomerReturnRefunds: roundMoney(todayCustomerReturnRefunds),
      expiringSoonCount,
      expiredCount,
      customerReturnsCount,
      customerReturnsAmount,
      expiredReturnsCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};
