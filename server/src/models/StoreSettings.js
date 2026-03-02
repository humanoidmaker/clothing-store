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
    mode: 'test',
    test: {
      keyId: '',
      keySecretEncrypted: ''
    },
    live: {
      keyId: '',
      keySecretEncrypted: ''
    },
    updatedAt: null
  },
  stripe: {
    enabled: false,
    mode: 'test',
    test: {
      publishableKey: '',
      secretKeyEncrypted: '',
      webhookSecretEncrypted: ''
    },
    live: {
      publishableKey: '',
      secretKeyEncrypted: '',
      webhookSecretEncrypted: ''
    },
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
const defaultShowOutOfStockProducts = false;
const defaultAuthSecuritySettings = {
  sendLoginAlertEmail: false,
  recaptcha: {
    enabled: false,
    siteKey: '',
    secretKeyEncrypted: '',
    updatedAt: null
  },
  smtp: {
    enabled: false,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: '',
    passwordEncrypted: '',
    fromEmail: '',
    fromName: 'Humanoid Maker',
    updatedAt: null
  }
};
const defaultHomepageBannerSlider = {
  enabled: false,
  banners: [
    {
      id: 'new-arrivals',
      desktopImage: '/placeholders/banner-desktop-1.svg',
      mobileImage: '/placeholders/banner-mobile-1.svg',
      altText: 'New arrivals in seasonal clothing and accessories',
      linkUrl: '/'
    },
    {
      id: 'weekend-edit',
      desktopImage: '/placeholders/banner-desktop-2.svg',
      mobileImage: '/placeholders/banner-mobile-2.svg',
      altText: 'Weekend edit featuring modern street and casual styles',
      linkUrl: '/'
    },
    {
      id: 'workwear-capsule',
      desktopImage: '/placeholders/banner-desktop-3.svg',
      mobileImage: '/placeholders/banner-mobile-3.svg',
      altText: 'Compact workwear capsule for everyday outfits',
      linkUrl: '/'
    }
  ]
};
const defaultHomepageStyleDeskBar = {
  enabled: true,
  title: 'STYLE DESK',
  subtitle: 'New drops weekly • curated for compact browsing',
  backgroundColor: '#ffffff',
  accentColor: '#b54d66',
  titleColor: '#1d2230',
  subtitleColor: '#5e6472'
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
      default: 'Clothing Store',
      maxlength: 80
    },
    footerText: {
      type: String,
      required: true,
      trim: true,
      default: 'Premium everyday clothing, delivered across India.',
      maxlength: 220
    },
    showOutOfStockProducts: {
      type: Boolean,
      default: defaultShowOutOfStockProducts
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
        mode: {
          type: String,
          enum: ['test', 'live'],
          default: defaultPaymentGatewaySettings.razorpay.mode
        },
        test: {
          keyId: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.razorpay.test.keyId,
            maxlength: 120
          },
          keySecretEncrypted: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.razorpay.test.keySecretEncrypted
          }
        },
        live: {
          keyId: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.razorpay.live.keyId,
            maxlength: 120
          },
          keySecretEncrypted: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.razorpay.live.keySecretEncrypted
          }
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
        mode: {
          type: String,
          enum: ['test', 'live'],
          default: defaultPaymentGatewaySettings.stripe.mode
        },
        test: {
          publishableKey: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.stripe.test.publishableKey,
            maxlength: 180
          },
          secretKeyEncrypted: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.stripe.test.secretKeyEncrypted
          },
          webhookSecretEncrypted: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.stripe.test.webhookSecretEncrypted
          }
        },
        live: {
          publishableKey: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.stripe.live.publishableKey,
            maxlength: 180
          },
          secretKeyEncrypted: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.stripe.live.secretKeyEncrypted
          },
          webhookSecretEncrypted: {
            type: String,
            trim: true,
            default: defaultPaymentGatewaySettings.stripe.live.webhookSecretEncrypted
          }
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
    authSecurity: {
      sendLoginAlertEmail: {
        type: Boolean,
        default: defaultAuthSecuritySettings.sendLoginAlertEmail
      },
      recaptcha: {
        enabled: {
          type: Boolean,
          default: defaultAuthSecuritySettings.recaptcha.enabled
        },
        siteKey: {
          type: String,
          trim: true,
          default: defaultAuthSecuritySettings.recaptcha.siteKey,
          maxlength: 260
        },
        secretKeyEncrypted: {
          type: String,
          trim: true,
          default: defaultAuthSecuritySettings.recaptcha.secretKeyEncrypted
        },
        updatedAt: {
          type: Date,
          default: defaultAuthSecuritySettings.recaptcha.updatedAt
        }
      },
      smtp: {
        enabled: {
          type: Boolean,
          default: defaultAuthSecuritySettings.smtp.enabled
        },
        host: {
          type: String,
          trim: true,
          default: defaultAuthSecuritySettings.smtp.host,
          maxlength: 180
        },
        port: {
          type: Number,
          default: defaultAuthSecuritySettings.smtp.port,
          min: 1,
          max: 65535
        },
        secure: {
          type: Boolean,
          default: defaultAuthSecuritySettings.smtp.secure
        },
        username: {
          type: String,
          trim: true,
          default: defaultAuthSecuritySettings.smtp.username,
          maxlength: 180
        },
        passwordEncrypted: {
          type: String,
          trim: true,
          default: defaultAuthSecuritySettings.smtp.passwordEncrypted
        },
        fromEmail: {
          type: String,
          trim: true,
          lowercase: true,
          default: defaultAuthSecuritySettings.smtp.fromEmail,
          maxlength: 180
        },
        fromName: {
          type: String,
          trim: true,
          default: defaultAuthSecuritySettings.smtp.fromName,
          maxlength: 140
        },
        updatedAt: {
          type: Date,
          default: defaultAuthSecuritySettings.smtp.updatedAt
        }
      }
    },
    homepageBannerSlider: {
      enabled: {
        type: Boolean,
        default: defaultHomepageBannerSlider.enabled
      },
      banners: [
        {
          id: {
            type: String,
            trim: true,
            default: '',
            maxlength: 100
          },
          desktopImage: {
            type: String,
            trim: true,
            default: '',
            maxlength: 700
          },
          mobileImage: {
            type: String,
            trim: true,
            default: '',
            maxlength: 700
          },
          altText: {
            type: String,
            trim: true,
            default: '',
            maxlength: 180
          },
          linkUrl: {
            type: String,
            trim: true,
            default: '',
            maxlength: 700
          }
        }
      ]
    },
    homepageStyleDeskBar: {
      enabled: {
        type: Boolean,
        default: defaultHomepageStyleDeskBar.enabled
      },
      title: {
        type: String,
        trim: true,
        default: defaultHomepageStyleDeskBar.title,
        maxlength: 80
      },
      subtitle: {
        type: String,
        trim: true,
        default: defaultHomepageStyleDeskBar.subtitle,
        maxlength: 180
      },
      backgroundColor: {
        type: String,
        trim: true,
        default: defaultHomepageStyleDeskBar.backgroundColor
      },
      accentColor: {
        type: String,
        trim: true,
        default: defaultHomepageStyleDeskBar.accentColor
      },
      titleColor: {
        type: String,
        trim: true,
        default: defaultHomepageStyleDeskBar.titleColor
      },
      subtitleColor: {
        type: String,
        trim: true,
        default: defaultHomepageStyleDeskBar.subtitleColor
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
storeSettingsSchema.statics.defaultShowOutOfStockProducts = defaultShowOutOfStockProducts;
storeSettingsSchema.statics.defaultAuthSecuritySettings = defaultAuthSecuritySettings;
storeSettingsSchema.statics.defaultHomepageBannerSlider = defaultHomepageBannerSlider;
storeSettingsSchema.statics.defaultHomepageStyleDeskBar = defaultHomepageStyleDeskBar;

module.exports = mongoose.models.StoreSettings || mongoose.model('StoreSettings', storeSettingsSchema);


