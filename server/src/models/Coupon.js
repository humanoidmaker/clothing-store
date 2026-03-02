const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 40
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 200
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
      default: 'percentage'
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0.01
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    startsAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    active: {
      type: Boolean,
      default: true
    },
    resellerId: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    resellerName: {
      type: String,
      trim: true,
      default: ''
    },
    resellerDomain: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

couponSchema.index({ code: 1, resellerId: 1 }, { unique: true });

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
