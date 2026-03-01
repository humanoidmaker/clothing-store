const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressDefaults = {
  fullName: '',
  phone: '',
  email: '',
  street: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India'
};

const addressSchemaDefinition = {
  fullName: { type: String, trim: true, default: addressDefaults.fullName, maxlength: 120 },
  phone: { type: String, trim: true, default: addressDefaults.phone, maxlength: 30 },
  email: { type: String, trim: true, lowercase: true, default: addressDefaults.email, maxlength: 180 },
  street: { type: String, trim: true, default: addressDefaults.street, maxlength: 220 },
  addressLine2: { type: String, trim: true, default: addressDefaults.addressLine2, maxlength: 220 },
  city: { type: String, trim: true, default: addressDefaults.city, maxlength: 120 },
  state: { type: String, trim: true, default: addressDefaults.state, maxlength: 120 },
  postalCode: { type: String, trim: true, default: addressDefaults.postalCode, maxlength: 30 },
  country: { type: String, trim: true, default: addressDefaults.country, maxlength: 120 }
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: 30
    },
    defaultShippingAddress: addressSchemaDefinition,
    defaultBillingDetails: {
      sameAsShipping: {
        type: Boolean,
        default: true
      },
      ...addressSchemaDefinition
    },
    defaultTaxDetails: {
      businessPurchase: { type: Boolean, default: false },
      businessName: { type: String, trim: true, default: '', maxlength: 160 },
      gstin: { type: String, trim: true, default: '', maxlength: 30 },
      pan: { type: String, trim: true, default: '', maxlength: 20 },
      purchaseOrderNumber: { type: String, trim: true, default: '', maxlength: 80 },
      notes: { type: String, trim: true, default: '', maxlength: 500 }
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function save(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

