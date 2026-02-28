const Product = require('../models/Product');
const SeoSettings = require('../models/SeoSettings');
const {
  sanitizeSeoMeta,
  normalizeSeoKey,
  normalizePath,
  mergePublicPages
} = require('../utils/seo');

const SINGLETON_QUERY = { singletonKey: 'default' };
const defaultStoreName = 'Astra Attire';

const ensureSeoSettings = async (storeName = defaultStoreName) => {
  let settings = await SeoSettings.findOne(SINGLETON_QUERY);

  if (!settings) {
    settings = new SeoSettings({
      singletonKey: 'default'
    });
    settings.publicPages = mergePublicPages([], storeName);
    await settings.save();
    return settings;
  }

  let touched = false;
  const mergedPages = mergePublicPages(settings.publicPages || [], storeName);
  if (JSON.stringify(mergedPages) !== JSON.stringify(settings.publicPages || [])) {
    settings.publicPages = mergedPages;
    touched = true;
  }

  if (!settings.defaults) {
    settings.defaults = sanitizeSeoMeta({});
    touched = true;
  }

  if (touched) {
    await settings.save();
  }

  return settings;
};

const buildSeoSettingsResponse = (settings) => ({
  defaults: sanitizeSeoMeta(settings.defaults || {}),
  publicPages: mergePublicPages(settings.publicPages || [])
});

const getSeoAdminData = async (req, res) => {
  const settings = await ensureSeoSettings();
  return res.json(buildSeoSettingsResponse(settings));
};

const updateSeoDefaults = async (req, res) => {
  const settings = await ensureSeoSettings();
  settings.defaults = sanitizeSeoMeta(req.body?.meta || {});
  await settings.save();
  return res.json(buildSeoSettingsResponse(settings));
};

const upsertPublicPageSeo = async (req, res) => {
  const key = normalizeSeoKey(req.body?.key);
  const path = normalizePath(req.body?.path);
  const label = String(req.body?.label || '').trim().slice(0, 80);

  if (!key) {
    return res.status(400).json({ message: 'Page key is required' });
  }
  if (!label) {
    return res.status(400).json({ message: 'Page label is required' });
  }
  if (!path) {
    return res.status(400).json({ message: 'Page path is required' });
  }

  const settings = await ensureSeoSettings();
  const meta = sanitizeSeoMeta(req.body?.meta || {});
  const pages = mergePublicPages(settings.publicPages || []);

  const existingByPath = pages.find((page) => page.path === path && page.key !== key);
  if (existingByPath) {
    return res.status(400).json({ message: `Path already mapped to "${existingByPath.label}"` });
  }

  const existingIndex = pages.findIndex((page) => page.key === key);
  if (existingIndex >= 0) {
    pages[existingIndex] = {
      ...pages[existingIndex],
      key,
      label,
      path,
      meta
    };
  } else {
    pages.push({ key, label, path, meta });
  }

  settings.publicPages = pages;
  await settings.save();

  return res.json(buildSeoSettingsResponse(settings));
};

const deletePublicPageSeo = async (req, res) => {
  const key = normalizeSeoKey(req.params.key);
  if (!key) {
    return res.status(400).json({ message: 'Page key is required' });
  }

  const settings = await ensureSeoSettings();
  const pages = mergePublicPages(settings.publicPages || []);
  const protectedPages = new Set(['home', 'wishlist', 'cart', 'login', 'register', 'checkout', 'orders']);

  if (protectedPages.has(key)) {
    return res.status(400).json({ message: 'Default public pages cannot be deleted' });
  }

  const nextPages = pages.filter((page) => page.key !== key);
  if (nextPages.length === pages.length) {
    return res.status(404).json({ message: 'SEO page configuration not found' });
  }

  settings.publicPages = nextPages;
  await settings.save();
  return res.json(buildSeoSettingsResponse(settings));
};

const getSeoProducts = async (req, res) => {
  const products = await Product.find({})
    .select('name category brand image seo')
    .sort({ createdAt: -1 });

  return res.json(
    products.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category,
      brand: product.brand,
      image: product.image,
      seo: sanitizeSeoMeta(product.seo || {})
    }))
  );
};

const getSeoProductById = async (req, res) => {
  const product = await Product.findById(req.params.id).select('name category brand image description seo');

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.json({
    _id: product._id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    image: product.image,
    description: product.description,
    seo: sanitizeSeoMeta(product.seo || {})
  });
};

const updateSeoProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  product.seo = sanitizeSeoMeta(req.body?.seo || {});
  await product.save();

  return res.json({
    _id: product._id,
    name: product.name,
    seo: sanitizeSeoMeta(product.seo || {})
  });
};

module.exports = {
  ensureSeoSettings,
  getSeoAdminData,
  updateSeoDefaults,
  upsertPublicPageSeo,
  deletePublicPageSeo,
  getSeoProducts,
  getSeoProductById,
  updateSeoProduct
};
