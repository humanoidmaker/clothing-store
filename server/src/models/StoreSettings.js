const mongoose = require('mongoose');

const defaultThemeSettings = {
  primaryColor: '#1b3557',
  secondaryColor: '#b54d66',
  backgroundDefault: '#f6f3ef',
  backgroundPaper: '#ffffff',
  textPrimary: '#1d2230',
  textSecondary: '#5e6472',
  bodyFontFamily: 'Manrope',
  headingFontFamily: 'Playfair Display'
};

const defaultRazorpaySettings = {
  keyId: '',
  keySecretEncrypted: '',
  updatedAt: null
};

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
    },
    theme: {
      primaryColor: {
        type: String,
        trim: true,
        default: defaultThemeSettings.primaryColor
      },
      secondaryColor: {
        type: String,
        trim: true,
        default: defaultThemeSettings.secondaryColor
      },
      backgroundDefault: {
        type: String,
        trim: true,
        default: defaultThemeSettings.backgroundDefault
      },
      backgroundPaper: {
        type: String,
        trim: true,
        default: defaultThemeSettings.backgroundPaper
      },
      textPrimary: {
        type: String,
        trim: true,
        default: defaultThemeSettings.textPrimary
      },
      textSecondary: {
        type: String,
        trim: true,
        default: defaultThemeSettings.textSecondary
      },
      bodyFontFamily: {
        type: String,
        trim: true,
        default: defaultThemeSettings.bodyFontFamily,
        maxlength: 80
      },
      headingFontFamily: {
        type: String,
        trim: true,
        default: defaultThemeSettings.headingFontFamily,
        maxlength: 80
      }
    },
    razorpay: {
      keyId: {
        type: String,
        trim: true,
        default: defaultRazorpaySettings.keyId,
        maxlength: 80
      },
      keySecretEncrypted: {
        type: String,
        trim: true,
        default: defaultRazorpaySettings.keySecretEncrypted
      },
      updatedAt: {
        type: Date,
        default: defaultRazorpaySettings.updatedAt
      }
    }
  },
  {
    timestamps: true
  }
);

storeSettingsSchema.statics.defaultThemeSettings = defaultThemeSettings;
storeSettingsSchema.statics.defaultRazorpaySettings = defaultRazorpaySettings;

module.exports = mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);

