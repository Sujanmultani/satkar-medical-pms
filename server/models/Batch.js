const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      index: true,
    },
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    mfgDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    purchaseRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    mrp: {
      type: Number,
      min: 0,
      default: 0,
    },
    gstPercent: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'expiring_soon', 'expired'],
      default: 'active',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending'],
      default: 'pending',
      index: true,
    },
    amountDue: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Batch', batchSchema);
