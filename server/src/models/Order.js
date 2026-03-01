const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    image: {
      type: String
    },
    price: {
      type: Number,
      required: true
    },
    purchasePrice: {
      type: Number,
      min: 0,
      default: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    selectedSize: {
      type: String,
      default: ''
    },
    selectedColor: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    orderItems: {
      type: [orderItemSchema],
      required: true
    },
    shippingAddress: {
      fullName: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      street: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true }
    },
    billingDetails: {
      sameAsShipping: { type: Boolean, default: true },
      fullName: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      street: { type: String, default: '' },
      addressLine2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' }
    },
    taxDetails: {
      businessPurchase: { type: Boolean, default: false },
      businessName: { type: String, default: '' },
      gstin: { type: String, default: '' },
      pan: { type: String, default: '' },
      purchaseOrderNumber: { type: String, default: '' },
      notes: { type: String, default: '' }
    },
    paymentMethod: {
      type: String,
      default: 'Cash on Delivery'
    },
    paymentResult: {
      gateway: { type: String },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      stripeSessionId: { type: String },
      stripePaymentIntentId: { type: String },
      paypalOrderId: { type: String },
      paypalCaptureId: { type: String },
      payuTxnId: { type: String },
      payuPaymentId: { type: String },
      cashfreeOrderId: { type: String },
      cashfreePaymentId: { type: String },
      phonepeTransactionId: { type: String },
      phonepeTransactionReference: { type: String }
    },
    paidAt: {
      type: Date
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    pricing: {
      itemsTotal: { type: Number, min: 0, default: 0 },
      codCharge: { type: Number, min: 0, default: 0 },
      finalTotal: { type: Number, min: 0, default: 0 }
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);

