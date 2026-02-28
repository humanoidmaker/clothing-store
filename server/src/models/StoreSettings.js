const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      default: 'default',
      unique: true
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
      default: 'Astra Attire',
      maxlength: 80
    },
    footerText: {
      type: String,
      required: true,
      trim: true,
      default: 'Premium everyday clothing, delivered across India.',
      maxlength: 220
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
