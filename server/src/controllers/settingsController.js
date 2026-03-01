const StoreSettings = require('../models/StoreSettings');
const { encryptSettingValue } = require('../utils/secureSettings');

const SINGLETON_QUERY = { singletonKey: 'default' };
const defaultStoreName = 'Astra Attire';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';
const defaultThemeSettings = StoreSettings.defaultThemeSettings;
const defaultPaymentGatewaySettings = StoreSettings.defaultPaymentGatewaySettings;
const hexColorPattern = /^#([0-9a-fA-F]{6})$/;

const cloneGatewayDefaults = () => JSON.parse(JSON.stringify(defaultPaymentGatewaySettings));

const normalizeThemeInput = (value = {}) => ({
  primaryColor: String(value.primaryColor || '').trim(),
  secondaryColor: String(value.secondaryColor || '').trim(),
  backgroundDefault: String(value.backgroundDefault || '').trim(),
  backgroundPaper: String(value.backgroundPaper || '').trim(),
  textPrimary: String(value.textPrimary || '').trim(),
  textSecondary: String(value.textSecondary || '').trim(),
  bodyFontFamily: String(value.bodyFontFamily || '').trim(),
  headingFontFamily: String(value.headingFontFamily || '').trim()
});

const validateHex = (value, label) => {
  if (!hexColorPattern.test(value)) {
    throw new Error(`${label} must be a valid hex color like #1b3557`);
  }
};

const sanitizeTheme = (theme) => {
  const nextTheme = normalizeThemeInput(theme);

  validateHex(nextTheme.primaryColor, 'Primary color');
  validateHex(nextTheme.secondaryColor, 'Secondary color');
  validateHex(nextTheme.backgroundDefault, 'Background color');
  validateHex(nextTheme.backgroundPaper, 'Surface color');
  validateHex(nextTheme.textPrimary, 'Primary text color');
  validateHex(nextTheme.textSecondary, 'Secondary text color');

  if (!nextTheme.bodyFontFamily) {
    throw new Error('Body font is required');
  }
  if (!nextTheme.headingFontFamily) {
    throw new Error('Heading font is required');
  }
  if (nextTheme.bodyFontFamily.length > 80) {
    throw new Error('Body font must be 80 characters or less');
  }
  if (nextTheme.headingFontFamily.length > 80) {
    throw new Error('Heading font must be 80 characters or less');
  }

  return nextTheme;
};

const normalizeThemeOutput = (theme = {}) => ({
  primaryColor: String(theme.primaryColor || '').trim() || defaultThemeSettings.primaryColor,
  secondaryColor: String(theme.secondaryColor || '').trim() || defaultThemeSettings.secondaryColor,
  backgroundDefault: String(theme.backgroundDefault || '').trim() || defaultThemeSettings.backgroundDefault,
  backgroundPaper: String(theme.backgroundPaper || '').trim() || defaultThemeSettings.backgroundPaper,
  textPrimary: String(theme.textPrimary || '').trim() || defaultThemeSettings.textPrimary,
  textSecondary: String(theme.textSecondary || '').trim() || defaultThemeSettings.textSecondary,
  bodyFontFamily: String(theme.bodyFontFamily || '').trim() || defaultThemeSettings.bodyFontFamily,
  headingFontFamily: String(theme.headingFontFamily || '').trim() || defaultThemeSettings.headingFontFamily
});

const normalizePaymentGatewaysInput = (value = {}, legacyRazorpay = {}) => {
  const defaults = cloneGatewayDefaults();
  const gateways = value && typeof value === 'object' ? value : {};

  const normalized = {
    cashOnDelivery: {
      enabled:
        typeof gateways?.cashOnDelivery?.enabled === 'boolean'
          ? gateways.cashOnDelivery.enabled
          : defaults.cashOnDelivery.enabled
    },
    razorpay: {
      enabled:
        typeof gateways?.razorpay?.enabled === 'boolean' ? gateways.razorpay.enabled : defaults.razorpay.enabled,
      keyId: String(gateways?.razorpay?.keyId || '').trim(),
      keySecretEncrypted: String(gateways?.razorpay?.keySecretEncrypted || '').trim(),
      updatedAt: gateways?.razorpay?.updatedAt || null
    },
    stripe: {
      enabled: typeof gateways?.stripe?.enabled === 'boolean' ? gateways.stripe.enabled : defaults.stripe.enabled,
      publishableKey: String(gateways?.stripe?.publishableKey || '').trim(),
      secretKeyEncrypted: String(gateways?.stripe?.secretKeyEncrypted || '').trim(),
      webhookSecretEncrypted: String(gateways?.stripe?.webhookSecretEncrypted || '').trim(),
      updatedAt: gateways?.stripe?.updatedAt || null
    },
    paypal: {
      enabled: typeof gateways?.paypal?.enabled === 'boolean' ? gateways.paypal.enabled : defaults.paypal.enabled,
      clientId: String(gateways?.paypal?.clientId || '').trim(),
      clientSecretEncrypted: String(gateways?.paypal?.clientSecretEncrypted || '').trim(),
      environment:
        ['sandbox', 'live'].includes(String(gateways?.paypal?.environment || '').trim().toLowerCase())
          ? String(gateways.paypal.environment).trim().toLowerCase()
          : defaults.paypal.environment,
      updatedAt: gateways?.paypal?.updatedAt || null
    },
    payu: {
      enabled: typeof gateways?.payu?.enabled === 'boolean' ? gateways.payu.enabled : defaults.payu.enabled,
      merchantKey: String(gateways?.payu?.merchantKey || '').trim(),
      merchantSaltEncrypted: String(gateways?.payu?.merchantSaltEncrypted || '').trim(),
      environment:
        ['test', 'live'].includes(String(gateways?.payu?.environment || '').trim().toLowerCase())
          ? String(gateways.payu.environment).trim().toLowerCase()
          : defaults.payu.environment,
      updatedAt: gateways?.payu?.updatedAt || null
    },
    cashfree: {
      enabled: typeof gateways?.cashfree?.enabled === 'boolean' ? gateways.cashfree.enabled : defaults.cashfree.enabled,
      appId: String(gateways?.cashfree?.appId || '').trim(),
      secretKeyEncrypted: String(gateways?.cashfree?.secretKeyEncrypted || '').trim(),
      environment:
        ['sandbox', 'production'].includes(String(gateways?.cashfree?.environment || '').trim().toLowerCase())
          ? String(gateways.cashfree.environment).trim().toLowerCase()
          : defaults.cashfree.environment,
      updatedAt: gateways?.cashfree?.updatedAt || null
    },
    phonepe: {
      enabled: typeof gateways?.phonepe?.enabled === 'boolean' ? gateways.phonepe.enabled : defaults.phonepe.enabled,
      merchantId: String(gateways?.phonepe?.merchantId || '').trim(),
      saltKeyEncrypted: String(gateways?.phonepe?.saltKeyEncrypted || '').trim(),
      saltIndex: String(gateways?.phonepe?.saltIndex || '').trim() || defaults.phonepe.saltIndex,
      environment:
        ['sandbox', 'production'].includes(String(gateways?.phonepe?.environment || '').trim().toLowerCase())
          ? String(gateways.phonepe.environment).trim().toLowerCase()
          : defaults.phonepe.environment,
      updatedAt: gateways?.phonepe?.updatedAt || null
    }
  };

  // Migration from legacy top-level Razorpay fields.
  const legacyKeyId = String(legacyRazorpay?.keyId || '').trim();
  const legacySecretEncrypted = String(legacyRazorpay?.keySecretEncrypted || '').trim();
  if (!normalized.razorpay.keyId && legacyKeyId) {
    normalized.razorpay.keyId = legacyKeyId;
  }
  if (!normalized.razorpay.keySecretEncrypted && legacySecretEncrypted) {
    normalized.razorpay.keySecretEncrypted = legacySecretEncrypted;
    if (!normalized.razorpay.updatedAt && legacyRazorpay?.updatedAt) {
      normalized.razorpay.updatedAt = legacyRazorpay.updatedAt;
    }
  }

  return normalized;
};

const normalizePaymentGatewaysOutput = (value = {}) => {
  const normalized = normalizePaymentGatewaysInput(value);
  return {
    cashOnDelivery: {
      enabled: Boolean(normalized.cashOnDelivery.enabled)
    },
    razorpay: {
      enabled: Boolean(normalized.razorpay.enabled),
      keyId: normalized.razorpay.keyId,
      keySecretConfigured: Boolean(normalized.razorpay.keySecretEncrypted),
      updatedAt: normalized.razorpay.updatedAt || null
    },
    stripe: {
      enabled: Boolean(normalized.stripe.enabled),
      publishableKey: normalized.stripe.publishableKey,
      secretKeyConfigured: Boolean(normalized.stripe.secretKeyEncrypted),
      webhookSecretConfigured: Boolean(normalized.stripe.webhookSecretEncrypted),
      updatedAt: normalized.stripe.updatedAt || null
    },
    paypal: {
      enabled: Boolean(normalized.paypal.enabled),
      clientId: normalized.paypal.clientId,
      clientSecretConfigured: Boolean(normalized.paypal.clientSecretEncrypted),
      environment: normalized.paypal.environment,
      updatedAt: normalized.paypal.updatedAt || null
    },
    payu: {
      enabled: Boolean(normalized.payu.enabled),
      merchantKey: normalized.payu.merchantKey,
      merchantSaltConfigured: Boolean(normalized.payu.merchantSaltEncrypted),
      environment: normalized.payu.environment,
      updatedAt: normalized.payu.updatedAt || null
    },
    cashfree: {
      enabled: Boolean(normalized.cashfree.enabled),
      appId: normalized.cashfree.appId,
      secretKeyConfigured: Boolean(normalized.cashfree.secretKeyEncrypted),
      environment: normalized.cashfree.environment,
      updatedAt: normalized.cashfree.updatedAt || null
    },
    phonepe: {
      enabled: Boolean(normalized.phonepe.enabled),
      merchantId: normalized.phonepe.merchantId,
      saltKeyConfigured: Boolean(normalized.phonepe.saltKeyEncrypted),
      saltIndex: normalized.phonepe.saltIndex,
      environment: normalized.phonepe.environment,
      updatedAt: normalized.phonepe.updatedAt || null
    }
  };
};

const buildResponse = (settings) => ({
  storeName: settings.storeName,
  footerText: settings.footerText,
  theme: normalizeThemeOutput(settings.theme)
});

const buildAdminResponse = (settings) => ({
  ...buildResponse(settings),
  paymentGateways: normalizePaymentGatewaysOutput(
    normalizePaymentGatewaysInput(settings.paymentGateways || {}, settings.razorpay || {})
  )
});

const ensureSettings = async () => {
  let settings = await StoreSettings.findOne(SINGLETON_QUERY);

  if (!settings) {
    settings = new StoreSettings({
      singletonKey: 'default',
      storeName: defaultStoreName,
      footerText: defaultFooterText,
      theme: defaultThemeSettings,
      paymentGateways: defaultPaymentGatewaySettings
    });
    await settings.save();
    return settings;
  }

  let touched = false;

  if (!settings.storeName) {
    settings.storeName = defaultStoreName;
    touched = true;
  }
  if (!settings.footerText) {
    settings.footerText = defaultFooterText;
    touched = true;
  }

  const currentTheme = normalizeThemeInput(settings.theme || {});
  const mergedTheme = {
    primaryColor: currentTheme.primaryColor || defaultThemeSettings.primaryColor,
    secondaryColor: currentTheme.secondaryColor || defaultThemeSettings.secondaryColor,
    backgroundDefault: currentTheme.backgroundDefault || defaultThemeSettings.backgroundDefault,
    backgroundPaper: currentTheme.backgroundPaper || defaultThemeSettings.backgroundPaper,
    textPrimary: currentTheme.textPrimary || defaultThemeSettings.textPrimary,
    textSecondary: currentTheme.textSecondary || defaultThemeSettings.textSecondary,
    bodyFontFamily: currentTheme.bodyFontFamily || defaultThemeSettings.bodyFontFamily,
    headingFontFamily: currentTheme.headingFontFamily || defaultThemeSettings.headingFontFamily
  };
  const themeChanged = Object.keys(mergedTheme).some((key) => mergedTheme[key] !== currentTheme[key]);
  if (themeChanged) {
    settings.theme = mergedTheme;
    touched = true;
  }

  const mergedPaymentGateways = normalizePaymentGatewaysInput(settings.paymentGateways || {}, settings.razorpay || {});
  if (JSON.stringify(mergedPaymentGateways) !== JSON.stringify(settings.paymentGateways || {})) {
    settings.paymentGateways = mergedPaymentGateways;
    touched = true;
  }

  if (touched) {
    await settings.save();
  }

  return settings;
};

const getStoreSettings = async (req, res) => {
  const settings = await ensureSettings();
  return res.json(buildResponse(settings));
};

const getAdminStoreSettings = async (req, res) => {
  const settings = await ensureSettings();
  return res.json(buildAdminResponse(settings));
};

const ensureObjectPayload = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} payload must be an object`);
  }
  return value;
};

const trimWithLength = (value, label, max) => {
  const normalized = String(value || '').trim();
  if (normalized.length > max) {
    throw new Error(`${label} must be ${max} characters or less`);
  }
  return normalized;
};

const applyPaymentGatewayUpdates = (currentSettings, payload) => {
  const next = normalizePaymentGatewaysInput(currentSettings.paymentGateways || {}, currentSettings.razorpay || {});
  const source = ensureObjectPayload(payload, 'Payment gateways');
  const now = new Date();

  const hasAnyGatewayField = Object.keys(source).length > 0;
  if (!hasAnyGatewayField) {
    throw new Error('At least one payment gateway setting is required');
  }

  const maybeSetEnabled = (gatewayObj, incoming) => {
    if (Object.prototype.hasOwnProperty.call(incoming, 'enabled')) {
      gatewayObj.enabled = Boolean(incoming.enabled);
    }
  };

  if (Object.prototype.hasOwnProperty.call(source, 'cashOnDelivery')) {
    const cod = ensureObjectPayload(source.cashOnDelivery, 'Cash on Delivery');
    maybeSetEnabled(next.cashOnDelivery, cod);
  }

  if (Object.prototype.hasOwnProperty.call(source, 'razorpay')) {
    const razorpay = ensureObjectPayload(source.razorpay, 'Razorpay');
    maybeSetEnabled(next.razorpay, razorpay);

    if (Object.prototype.hasOwnProperty.call(razorpay, 'keyId')) {
      next.razorpay.keyId = trimWithLength(razorpay.keyId, 'Razorpay key id', 120);
      if (!next.razorpay.keyId) {
        next.razorpay.keySecretEncrypted = '';
        next.razorpay.updatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(razorpay, 'keySecret')) {
      const keySecret = String(razorpay.keySecret || '').trim();
      if (!keySecret) {
        next.razorpay.keySecretEncrypted = '';
        next.razorpay.updatedAt = null;
      } else {
        if (!next.razorpay.keyId) {
          throw new Error('Razorpay key id is required before saving secret');
        }
        if (keySecret.length > 240) {
          throw new Error('Razorpay key secret must be 240 characters or less');
        }
        next.razorpay.keySecretEncrypted = encryptSettingValue(keySecret);
        next.razorpay.updatedAt = now;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'stripe')) {
    const stripe = ensureObjectPayload(source.stripe, 'Stripe');
    maybeSetEnabled(next.stripe, stripe);

    if (Object.prototype.hasOwnProperty.call(stripe, 'publishableKey')) {
      next.stripe.publishableKey = trimWithLength(stripe.publishableKey, 'Stripe publishable key', 180);
    }

    if (Object.prototype.hasOwnProperty.call(stripe, 'secretKey')) {
      const secretKey = String(stripe.secretKey || '').trim();
      if (!secretKey) {
        next.stripe.secretKeyEncrypted = '';
      } else {
        if (secretKey.length > 240) {
          throw new Error('Stripe secret key must be 240 characters or less');
        }
        next.stripe.secretKeyEncrypted = encryptSettingValue(secretKey);
        next.stripe.updatedAt = now;
      }
    }

    if (Object.prototype.hasOwnProperty.call(stripe, 'webhookSecret')) {
      const webhookSecret = String(stripe.webhookSecret || '').trim();
      if (!webhookSecret) {
        next.stripe.webhookSecretEncrypted = '';
      } else {
        if (webhookSecret.length > 240) {
          throw new Error('Stripe webhook secret must be 240 characters or less');
        }
        next.stripe.webhookSecretEncrypted = encryptSettingValue(webhookSecret);
        next.stripe.updatedAt = now;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'paypal')) {
    const paypal = ensureObjectPayload(source.paypal, 'PayPal');
    maybeSetEnabled(next.paypal, paypal);

    if (Object.prototype.hasOwnProperty.call(paypal, 'clientId')) {
      next.paypal.clientId = trimWithLength(paypal.clientId, 'PayPal client id', 180);
      if (!next.paypal.clientId) {
        next.paypal.clientSecretEncrypted = '';
        next.paypal.updatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(paypal, 'environment')) {
      const env = String(paypal.environment || '').trim().toLowerCase();
      if (!['sandbox', 'live'].includes(env)) {
        throw new Error('PayPal environment must be either sandbox or live');
      }
      next.paypal.environment = env;
    }

    if (Object.prototype.hasOwnProperty.call(paypal, 'clientSecret')) {
      const clientSecret = String(paypal.clientSecret || '').trim();
      if (!clientSecret) {
        next.paypal.clientSecretEncrypted = '';
        next.paypal.updatedAt = null;
      } else {
        if (!next.paypal.clientId) {
          throw new Error('PayPal client id is required before saving secret');
        }
        if (clientSecret.length > 260) {
          throw new Error('PayPal client secret must be 260 characters or less');
        }
        next.paypal.clientSecretEncrypted = encryptSettingValue(clientSecret);
        next.paypal.updatedAt = now;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'payu')) {
    const payu = ensureObjectPayload(source.payu, 'PayU');
    maybeSetEnabled(next.payu, payu);

    if (Object.prototype.hasOwnProperty.call(payu, 'merchantKey')) {
      next.payu.merchantKey = trimWithLength(payu.merchantKey, 'PayU merchant key', 120);
      if (!next.payu.merchantKey) {
        next.payu.merchantSaltEncrypted = '';
        next.payu.updatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payu, 'environment')) {
      const env = String(payu.environment || '').trim().toLowerCase();
      if (!['test', 'live'].includes(env)) {
        throw new Error('PayU environment must be either test or live');
      }
      next.payu.environment = env;
    }

    if (Object.prototype.hasOwnProperty.call(payu, 'merchantSalt')) {
      const merchantSalt = String(payu.merchantSalt || '').trim();
      if (!merchantSalt) {
        next.payu.merchantSaltEncrypted = '';
        next.payu.updatedAt = null;
      } else {
        if (!next.payu.merchantKey) {
          throw new Error('PayU merchant key is required before saving salt');
        }
        if (merchantSalt.length > 240) {
          throw new Error('PayU merchant salt must be 240 characters or less');
        }
        next.payu.merchantSaltEncrypted = encryptSettingValue(merchantSalt);
        next.payu.updatedAt = now;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'cashfree')) {
    const cashfree = ensureObjectPayload(source.cashfree, 'Cashfree');
    maybeSetEnabled(next.cashfree, cashfree);

    if (Object.prototype.hasOwnProperty.call(cashfree, 'appId')) {
      next.cashfree.appId = trimWithLength(cashfree.appId, 'Cashfree app id', 140);
      if (!next.cashfree.appId) {
        next.cashfree.secretKeyEncrypted = '';
        next.cashfree.updatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(cashfree, 'environment')) {
      const env = String(cashfree.environment || '').trim().toLowerCase();
      if (!['sandbox', 'production'].includes(env)) {
        throw new Error('Cashfree environment must be either sandbox or production');
      }
      next.cashfree.environment = env;
    }

    if (Object.prototype.hasOwnProperty.call(cashfree, 'secretKey')) {
      const secretKey = String(cashfree.secretKey || '').trim();
      if (!secretKey) {
        next.cashfree.secretKeyEncrypted = '';
        next.cashfree.updatedAt = null;
      } else {
        if (!next.cashfree.appId) {
          throw new Error('Cashfree app id is required before saving secret key');
        }
        if (secretKey.length > 260) {
          throw new Error('Cashfree secret key must be 260 characters or less');
        }
        next.cashfree.secretKeyEncrypted = encryptSettingValue(secretKey);
        next.cashfree.updatedAt = now;
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'phonepe')) {
    const phonepe = ensureObjectPayload(source.phonepe, 'PhonePe');
    maybeSetEnabled(next.phonepe, phonepe);

    if (Object.prototype.hasOwnProperty.call(phonepe, 'merchantId')) {
      next.phonepe.merchantId = trimWithLength(phonepe.merchantId, 'PhonePe merchant id', 140);
      if (!next.phonepe.merchantId) {
        next.phonepe.saltKeyEncrypted = '';
        next.phonepe.updatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(phonepe, 'saltIndex')) {
      const saltIndex = String(phonepe.saltIndex || '').trim();
      if (!saltIndex) {
        throw new Error('PhonePe salt index is required');
      }
      if (saltIndex.length > 20) {
        throw new Error('PhonePe salt index must be 20 characters or less');
      }
      next.phonepe.saltIndex = saltIndex;
    }

    if (Object.prototype.hasOwnProperty.call(phonepe, 'environment')) {
      const env = String(phonepe.environment || '').trim().toLowerCase();
      if (!['sandbox', 'production'].includes(env)) {
        throw new Error('PhonePe environment must be either sandbox or production');
      }
      next.phonepe.environment = env;
    }

    if (Object.prototype.hasOwnProperty.call(phonepe, 'saltKey')) {
      const saltKey = String(phonepe.saltKey || '').trim();
      if (!saltKey) {
        next.phonepe.saltKeyEncrypted = '';
        next.phonepe.updatedAt = null;
      } else {
        if (!next.phonepe.merchantId) {
          throw new Error('PhonePe merchant id is required before saving salt key');
        }
        if (saltKey.length > 260) {
          throw new Error('PhonePe salt key must be 260 characters or less');
        }
        next.phonepe.saltKeyEncrypted = encryptSettingValue(saltKey);
        next.phonepe.updatedAt = now;
      }
    }
  }

  return next;
};

const updateStoreSettings = async (req, res) => {
  const hasStoreName = Object.prototype.hasOwnProperty.call(req.body || {}, 'storeName');
  const hasFooterText = Object.prototype.hasOwnProperty.call(req.body || {}, 'footerText');
  const hasTheme = Object.prototype.hasOwnProperty.call(req.body || {}, 'theme');
  const hasPaymentGateways = Object.prototype.hasOwnProperty.call(req.body || {}, 'paymentGateways');

  if (!hasStoreName && !hasFooterText && !hasTheme && !hasPaymentGateways) {
    return res.status(400).json({ message: 'No settings fields were provided' });
  }

  const settings = await ensureSettings();

  if (hasStoreName) {
    const nextStoreName = String(req.body.storeName || '').trim();
    if (!nextStoreName) {
      return res.status(400).json({ message: 'Store name is required' });
    }
    if (nextStoreName.length > 80) {
      return res.status(400).json({ message: 'Store name must be 80 characters or less' });
    }
    settings.storeName = nextStoreName;
  }

  if (hasFooterText) {
    const nextFooterText = String(req.body.footerText || '').trim();
    if (!nextFooterText) {
      return res.status(400).json({ message: 'Footer text is required' });
    }
    if (nextFooterText.length > 220) {
      return res.status(400).json({ message: 'Footer text must be 220 characters or less' });
    }
    settings.footerText = nextFooterText;
  }

  if (hasTheme) {
    try {
      settings.theme = sanitizeTheme(req.body.theme || {});
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message || 'Invalid theme settings' });
    }
  }

  if (hasPaymentGateways) {
    try {
      settings.paymentGateways = applyPaymentGatewayUpdates(settings, req.body.paymentGateways);
    } catch (gatewayError) {
      return res.status(400).json({ message: gatewayError.message || 'Invalid payment gateway settings' });
    }
  }

  await settings.save();
  return res.json(buildAdminResponse(settings));
};

module.exports = {
  getStoreSettings,
  getAdminStoreSettings,
  updateStoreSettings
};
