const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    storeType: {
      type: String,
      enum: ['medical', 'provision'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    composition: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    unit: {
      type: String,
      trim: true,
      default: '',
    },
    hsnCode: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

itemSchema.index({ name: 'text', composition: 'text' });

module.exports = mongoose.model('Item', itemSchema);
