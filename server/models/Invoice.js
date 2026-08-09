const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceNo: {
      type: String,
      trim: true,
      default: '',
    },
    invoiceDate: {
      type: Date,
    },
    scannedImageUrl: {
      type: String,
      default: '',
    },
    items: [
      {
        batchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch',
        },
        extractedData: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    gstBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    printedSubtotal: {
      type: Number,
      default: null,
    },
    printedRoundOff: {
      type: Number,
      default: null,
    },
    printedGrandTotal: {
      type: Number,
      default: null,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    calculatedAmount: {
      type: Number,
      default: null,
    },
    amountMismatch: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['scanned', 'confirmed'],
      default: 'scanned',
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ supplierName: 1, invoiceNo: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
