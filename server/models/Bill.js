const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    billNo: {
      type: String,
      unique: true,
      required: true,
    },
    billDate: {
      type: Date,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Item',
          required: true,
        },
        batchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch',
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        rate: {
          type: Number,
          required: true,
        },
        gst: {
          type: Number,
          default: 0,
        },
      },
    ],
    gstBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMode: {
      type: String,
      default: 'Cash',
    },
    shareStatus: {
      whatsapp: { type: Boolean, default: false },
      sms: { type: Boolean, default: false },
      printed: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Bill', billSchema);
