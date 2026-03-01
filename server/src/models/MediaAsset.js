const mongoose = require('mongoose');

const mediaAssetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: 'Image'
    },
    altText: {
      type: String,
      trim: true,
      maxlength: 220,
      default: ''
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    storagePath: {
      type: String,
      trim: true,
      default: ''
    },
    sizeBytes: {
      type: Number,
      min: 0,
      default: 0
    },
    mimeType: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    source: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'upload'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.MediaAsset || mongoose.model('MediaAsset', mediaAssetSchema);
