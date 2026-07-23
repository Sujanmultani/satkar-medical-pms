const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      trim: true,
      default: 'Satkar Medical',
    },
    gstin: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
