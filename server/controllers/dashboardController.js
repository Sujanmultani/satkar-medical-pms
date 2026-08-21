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
    
    const batches = await Batch.find({}).select('qty status expiryDate purchaseRate mrp').lean();
    
    let totalBatchQty = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let totalStockValue = 0;
    let totalStockValueMRP = 0;

    batches.forEach((b) => {
      const qty = b.qty || 0;
      totalBatchQty += qty;
      // Current stock worth: cost basis (purchase rate) and potential sale value (MRP)
      totalStockValue += qty * (b.purchaseRate || 0);
      totalStockValueMRP += qty * (b.mrp || 0);
      // Exclude qty <= 0 batches from expiring_soon and expired counts (matching Expiry Alerts)
      if (qty > 0) {
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

    // Today's Gross Sales — summed inside MongoDB instead of pulling every bill into memory
    const [todaySalesAgg] = await Bill.aggregate([
      { $match: { billDate: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', '$totalAmount'] } } } },
    ]);
    const todayGrossSales = todaySalesAgg?.total || 0;

    // Today's Customer Returns Refund Amount — summed inside MongoDB
    const [todayReturnsAgg] = await Return.aggregate([
      { $match: { type: 'customer', returnDate: { $gte: startOfDay, $lte: endOfDay } } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } },
    ]);
    const todayCustomerReturnRefunds = todayReturnsAgg?.total || 0;
    const todayNetSales = Math.max(0, roundMoney(todayGrossSales - todayCustomerReturnRefunds));

    // Overall Customer Returns Summary — summed + counted inside MongoDB
    const [customerReturnsAgg] = await Return.aggregate([
      { $match: { type: 'customer' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' }, count: { $sum: 1 } } },
    ]);
    const customerReturnsCount = customerReturnsAgg?.count || 0;
    const customerReturnsAmount = roundMoney(customerReturnsAgg?.total || 0);

    // Overall Expired Supplier Returns Summary
    const expiredReturnsCount = await Return.countDocuments({ type: 'supplier', reason: 'expired' });

    // All-Time Lifetime Revenue — summed inside MongoDB instead of loading every bill ever made
    const [allBillsAgg] = await Bill.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ['$grandTotal', '$totalAmount'] } } } },
    ]);
    const totalGrossRevenue = allBillsAgg?.total || 0;
    const totalRevenue = Math.max(0, roundMoney(totalGrossRevenue - customerReturnsAmount));

    return res.status(200).json({
      totalItems,
      totalBatchQty,
      totalStockValue: roundMoney(totalStockValue),
      totalStockValueMRP: roundMoney(totalStockValueMRP),
      todaySales: todayNetSales,
      todayGrossSales: roundMoney(todayGrossSales),
      todayCustomerReturnRefunds: roundMoney(todayCustomerReturnRefunds),
      totalRevenue,
      totalGrossRevenue: roundMoney(totalGrossRevenue),
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
