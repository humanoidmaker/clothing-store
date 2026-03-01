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

const defaultPaymentGatewaySettings = {
  cashOnDelivery: {
    enabled: true
  },
  razorpay: {
    enabled: true,
    keyId: '',
    keySecretEncrypted: '',
    updatedAt: null
  },
  stripe: {
    enabled: false,
    publishableKey: '',
    secretKeyEncrypted: '',
    webhookSecretEncrypted: '',
    updatedAt: null
  },
  paypal: {
    enabled: false,
    clientId: '',
    clientSecretEncrypted: '',
    environment: 'sandbox',
    updatedAt: null
  },
  payu: {
    enabled: false,
    merchantKey: '',
    merchantSaltEncrypted: '',
    environment: 'test',
    updatedAt: null
  },
  cashfree: {
    enabled: false,
    appId: '',
    secretKeyEncrypted: '',
    environment: 'sandbox',
    updatedAt: null
  },
  phonepe: {
    enabled: false,
    merchantId: '',
    saltKeyEncrypted: '',
    saltIndex: '1',
    environment: 'sandbox',
    updatedAt: null
  }
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
    paymentGateways: {
      cashOnDelivery: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.cashOnDelivery.enabled
        }
      },
      razorpay: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.razorpay.enabled
        },
        keyId: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.razorpay.keyId,
          maxlength: 120
        },
        keySecretEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.razorpay.keySecretEncrypted
        },
        updatedAt: {
          type: Date,
          default: defaultPaymentGatewaySettings.razorpay.updatedAt
        }
      },
      stripe: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.stripe.enabled
        },
        publishableKey: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.stripe.publishableKey,
          maxlength: 180
        },
        secretKeyEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.stripe.secretKeyEncrypted
        },
        webhookSecretEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.stripe.webhookSecretEncrypted
        },
        updatedAt: {
          type: Date,
          default: defaultPaymentGatewaySettings.stripe.updatedAt
        }
      },
      paypal: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.paypal.enabled
        },
        clientId: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.paypal.clientId,
          maxlength: 180
        },
        clientSecretEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.paypal.clientSecretEncrypted
        },
        environment: {
          type: String,
          enum: ['sandbox', 'live'],
          default: defaultPaymentGatewaySettings.paypal.environment
        },
        updatedAt: {
          type: Date,
          default: defaultPaymentGatewaySettings.paypal.updatedAt
        }
      },
      payu: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.payu.enabled
        },
        merchantKey: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.payu.merchantKey,
          maxlength: 120
        },
        merchantSaltEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.payu.merchantSaltEncrypted
        },
        environment: {
          type: String,
          enum: ['test', 'live'],
          default: defaultPaymentGatewaySettings.payu.environment
        },
        updatedAt: {
          type: Date,
          default: defaultPaymentGatewaySettings.payu.updatedAt
        }
      },
      cashfree: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.cashfree.enabled
        },
        appId: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.cashfree.appId,
          maxlength: 140
        },
        secretKeyEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.cashfree.secretKeyEncrypted
        },
        environment: {
          type: String,
          enum: ['sandbox', 'production'],
          default: defaultPaymentGatewaySettings.cashfree.environment
        },
        updatedAt: {
          type: Date,
          default: defaultPaymentGatewaySettings.cashfree.updatedAt
        }
      },
      phonepe: {
        enabled: {
          type: Boolean,
          default: defaultPaymentGatewaySettings.phonepe.enabled
        },
        merchantId: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.phonepe.merchantId,
          maxlength: 140
        },
        saltKeyEncrypted: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.phonepe.saltKeyEncrypted
        },
        saltIndex: {
          type: String,
          trim: true,
          default: defaultPaymentGatewaySettings.phonepe.saltIndex,
          maxlength: 20
        },
        environment: {
          type: String,
          enum: ['sandbox', 'production'],
          default: defaultPaymentGatewaySettings.phonepe.environment
        },
        updatedAt: {
          type: Date,
          default: defaultPaymentGatewaySettings.phonepe.updatedAt
        }
      }
    },
    // Legacy field retained for backward migration into paymentGateways.razorpay.
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
storeSettingsSchema.statics.defaultPaymentGatewaySettings = defaultPaymentGatewaySettings;

module.exports = mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);

