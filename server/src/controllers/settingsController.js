const StoreSettings = require('../models/StoreSettings');
const { encryptSettingValue } = require('../utils/secureSettings');
const { resolveResellerContext } = require('../utils/resellerPricing');
const { getResellerSettingsById, updateResellerSettingsById } = require('../utils/resellerStore');
const { isDataImageUrl, isHttpUrl, saveImageDataUrlToStorage } = require('../utils/mediaStorage');

const SINGLETON_QUERY = { singletonKey: 'default' };
const defaultStoreName = 'Clothing Store';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';
const defaultThemeSettings = StoreSettings.defaultThemeSettings;
const defaultPaymentGatewaySettings = StoreSettings.defaultPaymentGatewaySettings;
const defaultShowOutOfStockProducts = StoreSettings.defaultShowOutOfStockProducts;
const defaultAuthSecuritySettings = StoreSettings.defaultAuthSecuritySettings;
const defaultHomepageBannerSlider = StoreSettings.defaultHomepageBannerSlider || { enabled: false, banners: [] };
const hexColorPattern = /^#([0-9a-fA-F]{6})$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cloneGatewayDefaults = () => JSON.parse(JSON.stringify(defaultPaymentGatewaySettings));
const cloneAuthSecurityDefaults = () => JSON.parse(JSON.stringify(defaultAuthSecuritySettings));
const cloneHomepageBannerSliderDefaults = () => JSON.parse(JSON.stringify(defaultHomepageBannerSlider));

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

const normalizeShowOutOfStockProducts = (value) =>
  typeof value === 'boolean' ? value : defaultShowOutOfStockProducts;

const isRelativeAppUrl = (value) => String(value || '').trim().startsWith('/');

const isValidBannerImageUrl = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return isRelativeAppUrl(normalized) || isHttpUrl(normalized);
};

const normalizeBannerLinkOutput = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (isRelativeAppUrl(normalized) || isHttpUrl(normalized)) {
    return normalized;
  }
  return '';
};

const normalizeHomepageBannerSliderOutput = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const banners = Array.isArray(source.banners) ? source.banners : [];
  const defaultEnabled = Boolean(defaultHomepageBannerSlider.enabled);

  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultEnabled,
    banners: banners
      .map((entry, index) => {
        const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
        const desktopImage = String(item.desktopImage || '').trim();
        const mobileImage = String(item.mobileImage || '').trim();
        const altText = String(item.altText || '').trim();
        const linkUrl = normalizeBannerLinkOutput(item.linkUrl || '');
        const id = String(item.id || '').trim() || `banner-${index + 1}`;

        if (!isValidBannerImageUrl(desktopImage) || !isValidBannerImageUrl(mobileImage)) {
          return null;
        }

        return {
          id: id.slice(0, 100),
          desktopImage: desktopImage.slice(0, 700),
          mobileImage: mobileImage.slice(0, 700),
          altText: altText.slice(0, 180),
          linkUrl: linkUrl.slice(0, 700)
        };
      })
      .filter(Boolean)
  };
};

const extractSmtpConfig = (source = {}) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  const direct = source.smtp;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return direct;
  }

  const detected = Object.entries(source).find(([key, value]) => {
    if (['sendLoginAlertEmail', 'recaptcha', 'smtp'].includes(key)) {
      return false;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    return (
      Object.prototype.hasOwnProperty.call(value, 'host') ||
      Object.prototype.hasOwnProperty.call(value, 'port') ||
      Object.prototype.hasOwnProperty.call(value, 'username') ||
      Object.prototype.hasOwnProperty.call(value, 'passwordEncrypted') ||
      Object.prototype.hasOwnProperty.call(value, 'fromEmail') ||
      Object.prototype.hasOwnProperty.call(value, 'fromName')
    );
  });

  return detected?.[1] || {};
};

const normalizeAuthSecurityInput = (value = {}) => {
  const defaults = cloneAuthSecurityDefaults();
  const source = value && typeof value === 'object' ? value : {};
  const smtpSource = extractSmtpConfig(source);

  const recaptchaEnabled =
    typeof source?.recaptcha?.enabled === 'boolean' ? source.recaptcha.enabled : defaults.recaptcha.enabled;
  const smtpEnabled = typeof smtpSource?.enabled === 'boolean' ? smtpSource.enabled : defaults.smtp.enabled;

  const normalized = {
    sendLoginAlertEmail:
      typeof source?.sendLoginAlertEmail === 'boolean'
        ? source.sendLoginAlertEmail
        : defaults.sendLoginAlertEmail,
    recaptcha: {
      enabled: recaptchaEnabled,
      siteKey: String(source?.recaptcha?.siteKey || '').trim(),
      secretKeyEncrypted: String(source?.recaptcha?.secretKeyEncrypted || '').trim(),
      updatedAt: source?.recaptcha?.updatedAt || null
    },
    smtp: {
      enabled: smtpEnabled,
      host: String(smtpSource?.host || defaults.smtp.host).trim() || defaults.smtp.host,
      port: Number(smtpSource?.port || defaults.smtp.port),
      secure: typeof smtpSource?.secure === 'boolean' ? smtpSource.secure : defaults.smtp.secure,
      username: String(smtpSource?.username || '').trim(),
      passwordEncrypted: String(smtpSource?.passwordEncrypted || '').trim(),
      fromEmail: String(smtpSource?.fromEmail || '').trim().toLowerCase(),
      fromName: String(smtpSource?.fromName || defaults.smtp.fromName).trim() || defaults.smtp.fromName,
      updatedAt: smtpSource?.updatedAt || null
    }
  };

  if (!Number.isFinite(normalized.smtp.port) || normalized.smtp.port < 1 || normalized.smtp.port > 65535) {
    normalized.smtp.port = defaults.smtp.port;
  }

  return normalized;
};

const normalizeAuthSecurityPublicOutput = (value = {}) => {
  const normalized = normalizeAuthSecurityInput(value);
  return {
    recaptcha: {
      enabled: Boolean(normalized.recaptcha.enabled),
      siteKey: normalized.recaptcha.siteKey
    }
  };
};

const normalizeAuthSecurityOutput = (value = {}) => {
  const normalized = normalizeAuthSecurityInput(value);
  return {
    sendLoginAlertEmail: Boolean(normalized.sendLoginAlertEmail),
    recaptcha: {
      enabled: Boolean(normalized.recaptcha.enabled),
      siteKey: normalized.recaptcha.siteKey,
      secretKeyConfigured: Boolean(normalized.recaptcha.secretKeyEncrypted),
      updatedAt: normalized.recaptcha.updatedAt || null
    },
    smtp: {
      enabled: Boolean(normalized.smtp.enabled),
      host: normalized.smtp.host,
      port: normalized.smtp.port,
      secure: Boolean(normalized.smtp.secure),
      username: normalized.smtp.username,
      passwordConfigured: Boolean(normalized.smtp.passwordEncrypted),
      fromEmail: normalized.smtp.fromEmail,
      fromName: normalized.smtp.fromName,
      updatedAt: normalized.smtp.updatedAt || null
    }
  };
};

const normalizePaymentGatewaysInput = (value = {}, legacyRazorpay = {}) => {
  const defaults = cloneGatewayDefaults();
  const gateways = value && typeof value === 'object' ? value : {};

  const razorpayMode = ['test', 'live'].includes(String(gateways?.razorpay?.mode || '').trim().toLowerCase())
    ? String(gateways.razorpay.mode).trim().toLowerCase()
    : defaults.razorpay.mode;
  const stripeMode = ['test', 'live'].includes(String(gateways?.stripe?.mode || '').trim().toLowerCase())
    ? String(gateways.stripe.mode).trim().toLowerCase()
    : defaults.stripe.mode;

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
      mode: razorpayMode,
      test: {
        keyId: String(gateways?.razorpay?.test?.keyId || gateways?.razorpay?.keyId || '').trim(),
        keySecretEncrypted: String(
          gateways?.razorpay?.test?.keySecretEncrypted || gateways?.razorpay?.keySecretEncrypted || ''
        ).trim()
      },
      live: {
        keyId: String(gateways?.razorpay?.live?.keyId || '').trim(),
        keySecretEncrypted: String(gateways?.razorpay?.live?.keySecretEncrypted || '').trim()
      },
      updatedAt: gateways?.razorpay?.updatedAt || null
    },
    stripe: {
      enabled: typeof gateways?.stripe?.enabled === 'boolean' ? gateways.stripe.enabled : defaults.stripe.enabled,
      mode: stripeMode,
      test: {
        publishableKey: String(gateways?.stripe?.test?.publishableKey || gateways?.stripe?.publishableKey || '').trim(),
        secretKeyEncrypted: String(
          gateways?.stripe?.test?.secretKeyEncrypted || gateways?.stripe?.secretKeyEncrypted || ''
        ).trim(),
        webhookSecretEncrypted: String(
          gateways?.stripe?.test?.webhookSecretEncrypted || gateways?.stripe?.webhookSecretEncrypted || ''
        ).trim()
      },
      live: {
        publishableKey: String(gateways?.stripe?.live?.publishableKey || '').trim(),
        secretKeyEncrypted: String(gateways?.stripe?.live?.secretKeyEncrypted || '').trim(),
        webhookSecretEncrypted: String(gateways?.stripe?.live?.webhookSecretEncrypted || '').trim()
      },
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
  if (!normalized.razorpay.test.keyId && legacyKeyId) {
    normalized.razorpay.test.keyId = legacyKeyId;
  }
  if (!normalized.razorpay.test.keySecretEncrypted && legacySecretEncrypted) {
    normalized.razorpay.test.keySecretEncrypted = legacySecretEncrypted;
    if (!normalized.razorpay.updatedAt && legacyRazorpay?.updatedAt) {
      normalized.razorpay.updatedAt = legacyRazorpay.updatedAt;
    }
  }

  return normalized;
};

const normalizePaymentGatewaysOutput = (value = {}) => {
  const normalized = normalizePaymentGatewaysInput(value);
  const razorpayActive = normalized.razorpay.mode === 'live' ? normalized.razorpay.live : normalized.razorpay.test;
  const stripeActive = normalized.stripe.mode === 'live' ? normalized.stripe.live : normalized.stripe.test;

  return {
    cashOnDelivery: {
      enabled: Boolean(normalized.cashOnDelivery.enabled)
    },
    razorpay: {
      enabled: Boolean(normalized.razorpay.enabled),
      mode: normalized.razorpay.mode,
      testKeyId: normalized.razorpay.test.keyId,
      liveKeyId: normalized.razorpay.live.keyId,
      testKeySecretConfigured: Boolean(normalized.razorpay.test.keySecretEncrypted),
      liveKeySecretConfigured: Boolean(normalized.razorpay.live.keySecretEncrypted),
      keyId: razorpayActive.keyId,
      keySecretConfigured: Boolean(razorpayActive.keySecretEncrypted),
      updatedAt: normalized.razorpay.updatedAt || null
    },
    stripe: {
      enabled: Boolean(normalized.stripe.enabled),
      mode: normalized.stripe.mode,
      testPublishableKey: normalized.stripe.test.publishableKey,
      livePublishableKey: normalized.stripe.live.publishableKey,
      testSecretKeyConfigured: Boolean(normalized.stripe.test.secretKeyEncrypted),
      liveSecretKeyConfigured: Boolean(normalized.stripe.live.secretKeyEncrypted),
      testWebhookSecretConfigured: Boolean(normalized.stripe.test.webhookSecretEncrypted),
      liveWebhookSecretConfigured: Boolean(normalized.stripe.live.webhookSecretEncrypted),
      publishableKey: stripeActive.publishableKey,
      secretKeyConfigured: Boolean(stripeActive.secretKeyEncrypted),
      webhookSecretConfigured: Boolean(stripeActive.webhookSecretEncrypted),
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

const resolveResellerPublicSettings = (settings, resellerContext = null) => {
  const reseller = resellerContext?.reseller || null;
  const resellerSettings =
    reseller && reseller.settings && typeof reseller.settings === 'object' && !Array.isArray(reseller.settings)
      ? reseller.settings
      : null;
  const resellerTheme = resellerSettings?.theme && typeof resellerSettings.theme === 'object'
    ? resellerSettings.theme
    : null;
  const resellerHomepageBannerSlider =
    resellerSettings?.homepageBannerSlider &&
    typeof resellerSettings.homepageBannerSlider === 'object' &&
    !Array.isArray(resellerSettings.homepageBannerSlider)
      ? resellerSettings.homepageBannerSlider
      : null;

  return {
    storeName: String(resellerSettings?.storeName || reseller?.websiteName || reseller?.name || '').trim() || settings.storeName,
    footerText: String(resellerSettings?.footerText || '').trim() || settings.footerText,
    showOutOfStockProducts:
      typeof resellerSettings?.showOutOfStockProducts === 'boolean'
        ? resellerSettings.showOutOfStockProducts
        : normalizeShowOutOfStockProducts(settings.showOutOfStockProducts),
    theme: normalizeThemeOutput(resellerTheme || settings.theme),
    homepageBannerSlider: normalizeHomepageBannerSliderOutput(
      resellerHomepageBannerSlider || settings.homepageBannerSlider || {}
    )
  };
};

const buildResponse = (settings, resellerContext = null) => {
  const reseller = resellerContext?.reseller || null;
  const resolvedPublicSettings = resolveResellerPublicSettings(settings, resellerContext);

  return {
    storeName: resolvedPublicSettings.storeName,
    footerText: resolvedPublicSettings.footerText,
    showOutOfStockProducts: resolvedPublicSettings.showOutOfStockProducts,
    theme: resolvedPublicSettings.theme,
    homepageBannerSlider: resolvedPublicSettings.homepageBannerSlider,
    authSecurity: normalizeAuthSecurityPublicOutput(settings.authSecurity || {}),
    reseller: reseller
      ? {
          id: reseller.id,
          name: reseller.name,
          websiteName: reseller.websiteName || reseller.name,
          adminUserId: String(reseller.adminUserId || '').trim(),
          adminUserEmail: String(reseller.adminUserEmail || '').trim().toLowerCase(),
          host: resellerContext?.host || ''
        }
      : null
  };
};

const getResellerSettingsObject = (resellerContext = null) => {
  const reseller = resellerContext?.reseller || null;
  if (!reseller || !reseller.settings || typeof reseller.settings !== 'object' || Array.isArray(reseller.settings)) {
    return null;
  }
  return reseller.settings;
};

const resolveScopedPaymentGatewaySettings = (settings, resellerContext = null) => {
  const resellerSettings = getResellerSettingsObject(resellerContext);
  const resellerPaymentGateways =
    resellerSettings?.paymentGateways &&
    typeof resellerSettings.paymentGateways === 'object' &&
    !Array.isArray(resellerSettings.paymentGateways)
      ? resellerSettings.paymentGateways
      : null;
  const isResellerScoped = Boolean(resellerSettings);
  const sourceGateways = isResellerScoped ? resellerPaymentGateways || {} : settings.paymentGateways || {};
  return normalizePaymentGatewaysInput(sourceGateways, settings.razorpay || {});
};

const buildAdminResponse = (settings, resellerContext = null, options = {}) => {
  const isMainAdmin = options.isMainAdmin !== false;
  return {
    ...buildResponse(settings, resellerContext),
    authSecurity: isMainAdmin
      ? normalizeAuthSecurityOutput(normalizeAuthSecurityInput(settings.authSecurity || {}))
      : normalizeAuthSecurityPublicOutput(settings.authSecurity || {}),
    paymentGateways: normalizePaymentGatewaysOutput(resolveScopedPaymentGatewaySettings(settings, resellerContext))
  };
};

const ensureSettings = async () => {
  let settings = await StoreSettings.findOne(SINGLETON_QUERY);

  if (!settings) {
    settings = new StoreSettings({
      singletonKey: 'default',
      storeName: defaultStoreName,
      footerText: defaultFooterText,
      showOutOfStockProducts: defaultShowOutOfStockProducts,
      theme: defaultThemeSettings,
      paymentGateways: defaultPaymentGatewaySettings,
      authSecurity: defaultAuthSecuritySettings,
      homepageBannerSlider: cloneHomepageBannerSliderDefaults()
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
  if (typeof settings.showOutOfStockProducts !== 'boolean') {
    settings.showOutOfStockProducts = defaultShowOutOfStockProducts;
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

  const mergedAuthSecurity = normalizeAuthSecurityInput(settings.authSecurity || {});
  if (JSON.stringify(mergedAuthSecurity) !== JSON.stringify(settings.authSecurity || {})) {
    settings.authSecurity = mergedAuthSecurity;
    touched = true;
  }

  if (
    !settings.homepageBannerSlider ||
    typeof settings.homepageBannerSlider !== 'object' ||
    Array.isArray(settings.homepageBannerSlider)
  ) {
    settings.homepageBannerSlider = cloneHomepageBannerSliderDefaults();
    touched = true;
  } else {
    const mergedHomepageBannerSlider = normalizeHomepageBannerSliderOutput(settings.homepageBannerSlider || {});
    if (JSON.stringify(mergedHomepageBannerSlider) !== JSON.stringify(settings.homepageBannerSlider || {})) {
      settings.homepageBannerSlider = mergedHomepageBannerSlider;
      touched = true;
    }
  }

  if (touched) {
    await settings.save();
  }

  return settings;
};

const getStoreSettings = async (req, res) => {
  const settings = await ensureSettings();
  let resellerContext = await resolveResellerContext(req);

  if (!resellerContext?.reseller && !req.user?.isAdmin && req.user?.isResellerAdmin) {
    const fallbackReseller = await getResellerSettingsById(String(req.user?.resellerId || '').trim());
    if (fallbackReseller?.reseller) {
      resellerContext = {
        reseller: fallbackReseller.reseller,
        host: resellerContext?.host || ''
      };
    }
  }

  return res.json(buildResponse(settings, resellerContext));
};

const getAdminStoreSettings = async (req, res) => {
  const settings = await ensureSettings();
  if (req.user?.isAdmin) {
    return res.json(buildAdminResponse(settings, null, { isMainAdmin: true }));
  }

  const resellerId = String(req.user?.resellerId || '').trim();
  if (!req.user?.isResellerAdmin || !resellerId) {
    return res.status(403).json({ message: 'Admin or reseller access required' });
  }

  const resellerSettingsState = await getResellerSettingsById(resellerId);
  if (!resellerSettingsState?.reseller) {
    return res.status(404).json({ message: 'Reseller profile not found' });
  }

  const resellerContext = {
    reseller: resellerSettingsState.reseller,
    host: req.headers?.host || ''
  };
  return res.json(buildAdminResponse(settings, resellerContext, { isMainAdmin: false }));
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

const sanitizeBannerLinkInput = (value, index) => {
  const normalized = trimWithLength(value || '', `Banner ${index + 1} link URL`, 700);
  if (!normalized) {
    return '';
  }
  if (isRelativeAppUrl(normalized) || isHttpUrl(normalized)) {
    return normalized;
  }
  throw new Error(`Banner ${index + 1} link URL must start with "/" or be a valid http/https URL`);
};

const saveBannerImageSource = async (value, label) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`${label} is required`);
  }

  if (isDataImageUrl(normalized)) {
    const saved = await saveImageDataUrlToStorage(normalized);
    return String(saved.url || '').trim();
  }

  if (!isValidBannerImageUrl(normalized)) {
    throw new Error(`${label} must be a valid image URL`);
  }

  if (normalized.length > 700) {
    throw new Error(`${label} must be 700 characters or less`);
  }

  return normalized;
};

const sanitizeHomepageBannerSliderInput = async (value = {}) => {
  const source = ensureObjectPayload(value, 'Homepage banner slider');
  const hasEnabled = Object.prototype.hasOwnProperty.call(source, 'enabled');
  const hasBanners = Object.prototype.hasOwnProperty.call(source, 'banners');

  if (!hasEnabled && !hasBanners) {
    throw new Error('Homepage banner slider payload must include enabled or banners');
  }

  if (hasBanners && !Array.isArray(source.banners)) {
    throw new Error('Homepage slider banners must be an array');
  }

  const banners = Array.isArray(source.banners) ? source.banners : [];
  const normalizedBanners = [];
  for (let index = 0; index < banners.length; index += 1) {
    const rawBanner = ensureObjectPayload(banners[index], `Banner ${index + 1}`);
    const id = trimWithLength(rawBanner.id || `banner-${Date.now()}-${index + 1}`, `Banner ${index + 1} id`, 100);
    const desktopImage = await saveBannerImageSource(rawBanner.desktopImage, `Banner ${index + 1} desktop image`);
    const mobileImage = await saveBannerImageSource(rawBanner.mobileImage, `Banner ${index + 1} mobile image`);
    const altText = trimWithLength(rawBanner.altText || '', `Banner ${index + 1} alt text`, 180);
    const linkUrl = sanitizeBannerLinkInput(rawBanner.linkUrl || '', index);

    normalizedBanners.push({
      id,
      desktopImage,
      mobileImage,
      altText,
      linkUrl
    });
  }

  return {
    enabled: hasEnabled ? Boolean(source.enabled) : Boolean(defaultHomepageBannerSlider.enabled),
    banners: normalizedBanners
  };
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

    if (Object.prototype.hasOwnProperty.call(razorpay, 'mode')) {
      const mode = String(razorpay.mode || '').trim().toLowerCase();
      if (!['test', 'live'].includes(mode)) {
        throw new Error('Razorpay mode must be either test or live');
      }
      next.razorpay.mode = mode;
    }

    const razorpayTest = razorpay?.test && typeof razorpay.test === 'object' ? razorpay.test : null;
    const razorpayLive = razorpay?.live && typeof razorpay.live === 'object' ? razorpay.live : null;
    const activeRazorpayMode = next.razorpay.mode === 'live' ? 'live' : 'test';
    const activeRazorpayConfig = next.razorpay[activeRazorpayMode];

    const setRazorpayKeyId = (target, incomingValue, label) => {
      target.keyId = trimWithLength(incomingValue, label, 120);
      if (!target.keyId) {
        target.keySecretEncrypted = '';
      }
    };

    if (razorpayTest && Object.prototype.hasOwnProperty.call(razorpayTest, 'keyId')) {
      setRazorpayKeyId(next.razorpay.test, razorpayTest.keyId, 'Razorpay test key id');
    }
    if (razorpayLive && Object.prototype.hasOwnProperty.call(razorpayLive, 'keyId')) {
      setRazorpayKeyId(next.razorpay.live, razorpayLive.keyId, 'Razorpay live key id');
    }
    if (Object.prototype.hasOwnProperty.call(razorpay, 'testKeyId')) {
      setRazorpayKeyId(next.razorpay.test, razorpay.testKeyId, 'Razorpay test key id');
    }
    if (Object.prototype.hasOwnProperty.call(razorpay, 'liveKeyId')) {
      setRazorpayKeyId(next.razorpay.live, razorpay.liveKeyId, 'Razorpay live key id');
    }
    if (Object.prototype.hasOwnProperty.call(razorpay, 'keyId')) {
      setRazorpayKeyId(activeRazorpayConfig, razorpay.keyId, `Razorpay ${activeRazorpayMode} key id`);
    }

    const setRazorpaySecret = (target, incomingValue, label) => {
      const keySecret = String(incomingValue || '').trim();
      if (!keySecret) {
        target.keySecretEncrypted = '';
        return;
      }
      if (!target.keyId) {
        throw new Error(`${label} key id is required before saving secret`);
      }
      if (keySecret.length > 240) {
        throw new Error(`${label} key secret must be 240 characters or less`);
      }
      target.keySecretEncrypted = encryptSettingValue(keySecret);
      next.razorpay.updatedAt = now;
    };

    if (razorpayTest && Object.prototype.hasOwnProperty.call(razorpayTest, 'keySecret')) {
      setRazorpaySecret(next.razorpay.test, razorpayTest.keySecret, 'Razorpay test');
    }
    if (razorpayLive && Object.prototype.hasOwnProperty.call(razorpayLive, 'keySecret')) {
      setRazorpaySecret(next.razorpay.live, razorpayLive.keySecret, 'Razorpay live');
    }
    if (Object.prototype.hasOwnProperty.call(razorpay, 'testKeySecret')) {
      setRazorpaySecret(next.razorpay.test, razorpay.testKeySecret, 'Razorpay test');
    }
    if (Object.prototype.hasOwnProperty.call(razorpay, 'liveKeySecret')) {
      setRazorpaySecret(next.razorpay.live, razorpay.liveKeySecret, 'Razorpay live');
    }
    if (Object.prototype.hasOwnProperty.call(razorpay, 'keySecret')) {
      setRazorpaySecret(activeRazorpayConfig, razorpay.keySecret, `Razorpay ${activeRazorpayMode}`);
    }

    if (!next.razorpay.test.keySecretEncrypted && !next.razorpay.live.keySecretEncrypted) {
      next.razorpay.updatedAt = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(source, 'stripe')) {
    const stripe = ensureObjectPayload(source.stripe, 'Stripe');
    maybeSetEnabled(next.stripe, stripe);

    if (Object.prototype.hasOwnProperty.call(stripe, 'mode')) {
      const mode = String(stripe.mode || '').trim().toLowerCase();
      if (!['test', 'live'].includes(mode)) {
        throw new Error('Stripe mode must be either test or live');
      }
      next.stripe.mode = mode;
    }

    const stripeTest = stripe?.test && typeof stripe.test === 'object' ? stripe.test : null;
    const stripeLive = stripe?.live && typeof stripe.live === 'object' ? stripe.live : null;
    const activeStripeMode = next.stripe.mode === 'live' ? 'live' : 'test';
    const activeStripeConfig = next.stripe[activeStripeMode];

    const setStripePublishableKey = (target, incomingValue, label) => {
      target.publishableKey = trimWithLength(incomingValue, `${label} publishable key`, 180);
    };

    if (stripeTest && Object.prototype.hasOwnProperty.call(stripeTest, 'publishableKey')) {
      setStripePublishableKey(next.stripe.test, stripeTest.publishableKey, 'Stripe test');
    }
    if (stripeLive && Object.prototype.hasOwnProperty.call(stripeLive, 'publishableKey')) {
      setStripePublishableKey(next.stripe.live, stripeLive.publishableKey, 'Stripe live');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'testPublishableKey')) {
      setStripePublishableKey(next.stripe.test, stripe.testPublishableKey, 'Stripe test');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'livePublishableKey')) {
      setStripePublishableKey(next.stripe.live, stripe.livePublishableKey, 'Stripe live');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'publishableKey')) {
      setStripePublishableKey(activeStripeConfig, stripe.publishableKey, `Stripe ${activeStripeMode}`);
    }

    const setStripeSecret = (target, incomingValue, label) => {
      const secretKey = String(incomingValue || '').trim();
      if (!secretKey) {
        target.secretKeyEncrypted = '';
        return;
      }
      if (secretKey.length > 240) {
        throw new Error(`${label} secret key must be 240 characters or less`);
      }
      target.secretKeyEncrypted = encryptSettingValue(secretKey);
      next.stripe.updatedAt = now;
    };

    if (stripeTest && Object.prototype.hasOwnProperty.call(stripeTest, 'secretKey')) {
      setStripeSecret(next.stripe.test, stripeTest.secretKey, 'Stripe test');
    }
    if (stripeLive && Object.prototype.hasOwnProperty.call(stripeLive, 'secretKey')) {
      setStripeSecret(next.stripe.live, stripeLive.secretKey, 'Stripe live');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'testSecretKey')) {
      setStripeSecret(next.stripe.test, stripe.testSecretKey, 'Stripe test');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'liveSecretKey')) {
      setStripeSecret(next.stripe.live, stripe.liveSecretKey, 'Stripe live');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'secretKey')) {
      setStripeSecret(activeStripeConfig, stripe.secretKey, `Stripe ${activeStripeMode}`);
    }

    const setStripeWebhookSecret = (target, incomingValue, label) => {
      const webhookSecret = String(incomingValue || '').trim();
      if (!webhookSecret) {
        target.webhookSecretEncrypted = '';
        return;
      }
      if (webhookSecret.length > 240) {
        throw new Error(`${label} webhook secret must be 240 characters or less`);
      }
      target.webhookSecretEncrypted = encryptSettingValue(webhookSecret);
      next.stripe.updatedAt = now;
    };

    if (stripeTest && Object.prototype.hasOwnProperty.call(stripeTest, 'webhookSecret')) {
      setStripeWebhookSecret(next.stripe.test, stripeTest.webhookSecret, 'Stripe test');
    }
    if (stripeLive && Object.prototype.hasOwnProperty.call(stripeLive, 'webhookSecret')) {
      setStripeWebhookSecret(next.stripe.live, stripeLive.webhookSecret, 'Stripe live');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'testWebhookSecret')) {
      setStripeWebhookSecret(next.stripe.test, stripe.testWebhookSecret, 'Stripe test');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'liveWebhookSecret')) {
      setStripeWebhookSecret(next.stripe.live, stripe.liveWebhookSecret, 'Stripe live');
    }
    if (Object.prototype.hasOwnProperty.call(stripe, 'webhookSecret')) {
      setStripeWebhookSecret(activeStripeConfig, stripe.webhookSecret, `Stripe ${activeStripeMode}`);
    }

    if (
      !next.stripe.test.secretKeyEncrypted &&
      !next.stripe.live.secretKeyEncrypted &&
      !next.stripe.test.webhookSecretEncrypted &&
      !next.stripe.live.webhookSecretEncrypted
    ) {
      next.stripe.updatedAt = null;
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

const applyAuthSecurityUpdates = (currentSettings, payload) => {
  const next = normalizeAuthSecurityInput(currentSettings.authSecurity || {});
  const source = ensureObjectPayload(payload, 'Authentication security');
  const now = new Date();

  if (Object.keys(source).length === 0) {
    throw new Error('At least one authentication setting is required');
  }

  if (Object.prototype.hasOwnProperty.call(source, 'sendLoginAlertEmail')) {
    next.sendLoginAlertEmail = Boolean(source.sendLoginAlertEmail);
  }

  if (Object.prototype.hasOwnProperty.call(source, 'recaptcha')) {
    const recaptcha = ensureObjectPayload(source.recaptcha, 'reCAPTCHA');

    if (Object.prototype.hasOwnProperty.call(recaptcha, 'enabled')) {
      next.recaptcha.enabled = Boolean(recaptcha.enabled);
    }

    if (Object.prototype.hasOwnProperty.call(recaptcha, 'siteKey')) {
      next.recaptcha.siteKey = trimWithLength(recaptcha.siteKey, 'reCAPTCHA site key', 260);
    }

    if (Object.prototype.hasOwnProperty.call(recaptcha, 'secretKey')) {
      const secret = String(recaptcha.secretKey || '').trim();
      if (!secret) {
        next.recaptcha.secretKeyEncrypted = '';
        next.recaptcha.updatedAt = null;
      } else {
        if (secret.length > 260) {
          throw new Error('reCAPTCHA secret key must be 260 characters or less');
        }
        next.recaptcha.secretKeyEncrypted = encryptSettingValue(secret);
        next.recaptcha.updatedAt = now;
      }
    }
  }

  const smtpSource = extractSmtpConfig(source);
  const hasSmtpPayload =
    (Object.prototype.hasOwnProperty.call(source, 'smtp') && source.smtp !== undefined) ||
    (smtpSource && Object.keys(smtpSource).length > 0);

  if (hasSmtpPayload) {
    const smtp = ensureObjectPayload(smtpSource, 'SMTP settings');

    if (Object.prototype.hasOwnProperty.call(smtp, 'enabled')) {
      next.smtp.enabled = Boolean(smtp.enabled);
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'host')) {
      next.smtp.host = trimWithLength(smtp.host, 'SMTP host', 180) || defaultAuthSecuritySettings.smtp.host;
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'port')) {
      const port = Number(smtp.port);
      if (!Number.isFinite(port) || port < 1 || port > 65535) {
        throw new Error('SMTP port must be between 1 and 65535');
      }
      next.smtp.port = Math.round(port);
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'secure')) {
      next.smtp.secure = Boolean(smtp.secure);
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'username')) {
      next.smtp.username = trimWithLength(smtp.username, 'SMTP username', 180);
      if (!next.smtp.username) {
        next.smtp.passwordEncrypted = '';
        next.smtp.updatedAt = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'fromEmail')) {
      const fromEmail = trimWithLength(smtp.fromEmail, 'SMTP from email', 180).toLowerCase();
      if (fromEmail && !emailPattern.test(fromEmail)) {
        throw new Error('SMTP from email must be a valid email address');
      }
      next.smtp.fromEmail = fromEmail;
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'fromName')) {
      next.smtp.fromName = trimWithLength(smtp.fromName, 'SMTP from name', 140) || defaultAuthSecuritySettings.smtp.fromName;
    }

    if (Object.prototype.hasOwnProperty.call(smtp, 'password')) {
      const password = String(smtp.password || '').trim();
      if (!password) {
        next.smtp.passwordEncrypted = '';
        next.smtp.updatedAt = null;
      } else {
        if (!next.smtp.username) {
          throw new Error('SMTP username is required before saving password');
        }
        if (password.length > 300) {
          throw new Error('SMTP password must be 300 characters or less');
        }
        next.smtp.passwordEncrypted = encryptSettingValue(password);
        next.smtp.updatedAt = now;
      }
    }
  }

  return next;
};

const updateStoreSettings = async (req, res) => {
  const hasStoreName = Object.prototype.hasOwnProperty.call(req.body || {}, 'storeName');
  const hasFooterText = Object.prototype.hasOwnProperty.call(req.body || {}, 'footerText');
  const hasShowOutOfStockProducts = Object.prototype.hasOwnProperty.call(req.body || {}, 'showOutOfStockProducts');
  const hasTheme = Object.prototype.hasOwnProperty.call(req.body || {}, 'theme');
  const hasHomepageBannerSlider = Object.prototype.hasOwnProperty.call(req.body || {}, 'homepageBannerSlider');
  const hasPaymentGateways = Object.prototype.hasOwnProperty.call(req.body || {}, 'paymentGateways');
  const hasAuthSecurity = Object.prototype.hasOwnProperty.call(req.body || {}, 'authSecurity');
  const isMainAdmin = Boolean(req.user?.isAdmin);
  const resellerId = String(req.user?.resellerId || '').trim();
  const isResellerAdmin = !isMainAdmin && Boolean(req.user?.isResellerAdmin) && Boolean(resellerId);

  if (
    !hasStoreName &&
    !hasFooterText &&
    !hasShowOutOfStockProducts &&
    !hasTheme &&
    !hasHomepageBannerSlider &&
    !hasPaymentGateways &&
    !hasAuthSecurity
  ) {
    return res.status(400).json({ message: 'No settings fields were provided' });
  }

  if (!isMainAdmin && !isResellerAdmin) {
    return res.status(403).json({ message: 'Admin or reseller access required' });
  }

  if (isResellerAdmin) {
    if (hasAuthSecurity) {
      return res.status(403).json({ message: 'Authentication security is managed by main admin' });
    }
    if (hasHomepageBannerSlider) {
      return res.status(403).json({ message: 'Homepage banner slider is managed by main admin' });
    }

    const resellerPatch = {};
    let settingsForReseller = null;

    if (hasStoreName) {
      const nextStoreName = String(req.body.storeName || '').trim();
      if (!nextStoreName) {
        return res.status(400).json({ message: 'Store name is required' });
      }
      if (nextStoreName.length > 80) {
        return res.status(400).json({ message: 'Store name must be 80 characters or less' });
      }
      resellerPatch.storeName = nextStoreName;
    }

    if (hasFooterText) {
      const nextFooterText = String(req.body.footerText || '').trim();
      if (!nextFooterText) {
        return res.status(400).json({ message: 'Footer text is required' });
      }
      if (nextFooterText.length > 220) {
        return res.status(400).json({ message: 'Footer text must be 220 characters or less' });
      }
      resellerPatch.footerText = nextFooterText;
    }

    if (hasShowOutOfStockProducts) {
      if (typeof req.body.showOutOfStockProducts !== 'boolean') {
        return res.status(400).json({ message: 'showOutOfStockProducts must be a boolean value' });
      }
      resellerPatch.showOutOfStockProducts = req.body.showOutOfStockProducts;
    }

    if (hasTheme) {
      try {
        resellerPatch.theme = sanitizeTheme(req.body.theme || {});
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message || 'Invalid theme settings' });
      }
    }

    if (hasPaymentGateways) {
      try {
        settingsForReseller = await ensureSettings();
        const resellerSettingsState = await getResellerSettingsById(resellerId);
        if (!resellerSettingsState?.reseller) {
          return res.status(404).json({ message: 'Reseller profile not found' });
        }

        const currentResellerPaymentGateways =
          resellerSettingsState.settings?.paymentGateways &&
          typeof resellerSettingsState.settings.paymentGateways === 'object' &&
          !Array.isArray(resellerSettingsState.settings.paymentGateways)
            ? resellerSettingsState.settings.paymentGateways
            : {};

        resellerPatch.paymentGateways = applyPaymentGatewayUpdates(
          {
            paymentGateways: normalizePaymentGatewaysInput(
              currentResellerPaymentGateways,
              settingsForReseller.razorpay || {}
            ),
            razorpay: settingsForReseller.razorpay || {}
          },
          req.body.paymentGateways
        );
      } catch (gatewayError) {
        return res.status(400).json({ message: gatewayError.message || 'Invalid payment gateway settings' });
      }
    }

    try {
      await updateResellerSettingsById(resellerId, resellerPatch);
      const settings = settingsForReseller || (await ensureSettings());
      const resellerSettingsState = await getResellerSettingsById(resellerId);
      const resellerContext = resellerSettingsState
        ? {
            reseller: resellerSettingsState.reseller,
            host: req.headers?.host || ''
          }
        : null;
      return res.json(buildAdminResponse(settings, resellerContext, { isMainAdmin: false }));
    } catch (error) {
      const normalizedMessage = String(error.message || '').trim().toLowerCase();
      const status = normalizedMessage.includes('not found') ? 404 : 400;
      return res.status(status).json({ message: error.message || 'Failed to update reseller settings' });
    }
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

  if (hasShowOutOfStockProducts) {
    if (typeof req.body.showOutOfStockProducts !== 'boolean') {
      return res.status(400).json({ message: 'showOutOfStockProducts must be a boolean value' });
    }
    settings.showOutOfStockProducts = req.body.showOutOfStockProducts;
  }

  if (hasTheme) {
    try {
      settings.theme = sanitizeTheme(req.body.theme || {});
    } catch (validationError) {
      return res.status(400).json({ message: validationError.message || 'Invalid theme settings' });
    }
  }

  if (hasHomepageBannerSlider) {
    try {
      settings.homepageBannerSlider = await sanitizeHomepageBannerSliderInput(req.body.homepageBannerSlider || {});
    } catch (bannerSliderError) {
      return res.status(400).json({ message: bannerSliderError.message || 'Invalid homepage banner slider settings' });
    }
  }

  if (hasPaymentGateways) {
    try {
      settings.paymentGateways = applyPaymentGatewayUpdates(settings, req.body.paymentGateways);
    } catch (gatewayError) {
      return res.status(400).json({ message: gatewayError.message || 'Invalid payment gateway settings' });
    }
  }

  if (hasAuthSecurity) {
    try {
      settings.authSecurity = applyAuthSecurityUpdates(settings, req.body.authSecurity);
    } catch (authSecurityError) {
      return res.status(400).json({ message: authSecurityError.message || 'Invalid authentication settings' });
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

