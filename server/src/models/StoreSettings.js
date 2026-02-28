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
    }
  },
  {
    timestamps: true
  }
);

storeSettingsSchema.statics.defaultThemeSettings = defaultThemeSettings;

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
