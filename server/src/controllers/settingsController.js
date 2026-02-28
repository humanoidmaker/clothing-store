const StoreSettings = require('../models/StoreSettings');

const SINGLETON_QUERY = { singletonKey: 'default' };
const defaultStoreName = 'Astra Attire';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';

const ensureSettings = async () => {
  let settings = await StoreSettings.findOne(SINGLETON_QUERY);

  if (!settings) {
    settings = new StoreSettings({
      singletonKey: 'default',
      storeName: defaultStoreName,
      footerText: defaultFooterText
    });
    await settings.save();
  }

  return settings;
};

const getStoreSettings = async (req, res) => {
  const settings = await ensureSettings();

  return res.json({
    storeName: settings.storeName,
    footerText: settings.footerText
  });
};

const updateStoreSettings = async (req, res) => {
  const hasStoreName = Object.prototype.hasOwnProperty.call(req.body || {}, 'storeName');
  const hasFooterText = Object.prototype.hasOwnProperty.call(req.body || {}, 'footerText');

  if (!hasStoreName && !hasFooterText) {
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

  await settings.save();

  return res.json({
    storeName: settings.storeName,
    footerText: settings.footerText
  });
};

module.exports = {
  getStoreSettings,
  updateStoreSettings
};
