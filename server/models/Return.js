const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    returnNo: {
      type: String,
      unique: true,
      required: true,
    },
    type: {
      type: String,
      enum: ['supplier', 'customer'],
      required: true,
      index: true,
    },
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
    storeType: {
      type: String,
      enum: ['medical', 'provision'],
      default: 'medical',
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      enum: ['expired', 'damaged', 'wrong_item', 'customer_dissatisfaction', 'other'],
      required: true,
    },
    returnDate: {
      type: Date,
      required: true,
      index: true,
    },
    restocked: {
      type: Boolean,
      default: false,
    },
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    creditNoteNo: {
      type: String,
      trim: true,
      default: '',
    },
    referenceBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
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
    refundAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Return', returnSchema);
