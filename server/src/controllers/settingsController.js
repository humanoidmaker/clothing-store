const StoreSettings = require('../models/StoreSettings');
const { encryptSettingValue } = require('../utils/secureSettings');

const SINGLETON_QUERY = { singletonKey: 'default' };
const defaultStoreName = 'Astra Attire';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';
const defaultThemeSettings = StoreSettings.defaultThemeSettings;
const defaultRazorpaySettings = StoreSettings.defaultRazorpaySettings;
const hexColorPattern = /^#([0-9a-fA-F]{6})$/;

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

const normalizeRazorpayOutput = (razorpay = {}) => ({
  keyId: String(razorpay.keyId || '').trim(),
  keySecretConfigured: Boolean(String(razorpay.keySecretEncrypted || '').trim()),
  updatedAt: razorpay.updatedAt || null
});

const buildResponse = (settings) => ({
  storeName: settings.storeName,
  footerText: settings.footerText,
  theme: normalizeThemeOutput(settings.theme)
});

const buildAdminResponse = (settings) => ({
  ...buildResponse(settings),
  razorpay: normalizeRazorpayOutput(settings.razorpay || {})
});

const ensureSettings = async () => {
  let settings = await StoreSettings.findOne(SINGLETON_QUERY);

  if (!settings) {
    settings = new StoreSettings({
      singletonKey: 'default',
      storeName: defaultStoreName,
      footerText: defaultFooterText,
      theme: defaultThemeSettings,
      razorpay: defaultRazorpaySettings
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

  const currentRazorpay = settings.razorpay || {};
  const normalizedRazorpay = {
    keyId: String(currentRazorpay.keyId || '').trim(),
    keySecretEncrypted: String(currentRazorpay.keySecretEncrypted || '').trim(),
    updatedAt: currentRazorpay.updatedAt || null
  };
  const razorpayChanged =
    !currentRazorpay ||
    normalizedRazorpay.keyId !== currentRazorpay.keyId ||
    normalizedRazorpay.keySecretEncrypted !== currentRazorpay.keySecretEncrypted ||
    normalizedRazorpay.updatedAt !== currentRazorpay.updatedAt;
  if (razorpayChanged) {
    settings.razorpay = normalizedRazorpay;
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

const updateStoreSettings = async (req, res) => {
  const hasStoreName = Object.prototype.hasOwnProperty.call(req.body || {}, 'storeName');
  const hasFooterText = Object.prototype.hasOwnProperty.call(req.body || {}, 'footerText');
  const hasTheme = Object.prototype.hasOwnProperty.call(req.body || {}, 'theme');
  const hasRazorpay = Object.prototype.hasOwnProperty.call(req.body || {}, 'razorpay');

  if (!hasStoreName && !hasFooterText && !hasTheme && !hasRazorpay) {
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

  if (hasRazorpay) {
    const razorpayPayload = req.body.razorpay || {};
    if (typeof razorpayPayload !== 'object' || Array.isArray(razorpayPayload)) {
      return res.status(400).json({ message: 'Razorpay settings payload must be an object' });
    }

    const hasRazorpayKeyId = Object.prototype.hasOwnProperty.call(razorpayPayload, 'keyId');
    const hasRazorpayKeySecret = Object.prototype.hasOwnProperty.call(razorpayPayload, 'keySecret');

    if (!hasRazorpayKeyId && !hasRazorpayKeySecret) {
      return res.status(400).json({ message: 'Razorpay key id or secret is required' });
    }

    if (hasRazorpayKeyId) {
      const nextRazorpayKeyId = String(razorpayPayload.keyId || '').trim();
      if (nextRazorpayKeyId.length > 80) {
        return res.status(400).json({ message: 'Razorpay key id must be 80 characters or less' });
      }

      settings.razorpay.keyId = nextRazorpayKeyId;
      if (!nextRazorpayKeyId) {
        settings.razorpay.keySecretEncrypted = '';
        settings.razorpay.updatedAt = null;
      }
    }

    if (hasRazorpayKeySecret) {
      const nextRazorpayKeySecret = String(razorpayPayload.keySecret || '').trim();
      if (!nextRazorpayKeySecret) {
        settings.razorpay.keySecretEncrypted = '';
        settings.razorpay.updatedAt = null;
      } else {
        const activeRazorpayKeyId = String(settings.razorpay.keyId || '').trim();
        if (!activeRazorpayKeyId) {
          return res.status(400).json({ message: 'Razorpay key id is required before saving secret' });
        }

        if (nextRazorpayKeySecret.length > 200) {
          return res.status(400).json({ message: 'Razorpay key secret must be 200 characters or less' });
        }

        try {
          settings.razorpay.keySecretEncrypted = encryptSettingValue(nextRazorpayKeySecret);
          settings.razorpay.updatedAt = new Date();
        } catch (encryptionError) {
          return res
            .status(500)
            .json({ message: encryptionError.message || 'Unable to securely save Razorpay secret' });
        }
      }
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
