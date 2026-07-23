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
    totalAmount: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model('Invoice', invoiceSchema);
