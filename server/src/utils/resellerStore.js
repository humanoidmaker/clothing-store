const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const StoreSettings = require('../models/StoreSettings');
const seoUtils = require('./seo');

const RESELLER_STORE_PATH = path.join(__dirname, '../../../storage/resellers.json');
const RESELLER_STORE_DIR = path.dirname(RESELLER_STORE_PATH);
const DEFAULT_STORE = {
  version: 1,
  updatedAt: null,
  resellers: []
};
const HOST_PATTERN = /^[a-z0-9.-]+$/i;
const PRODUCT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const MAX_MARGIN_PERCENT = 1000;
const DEV_DEFAULT_PORT = Number(process.env.PORT || 3000);
const RESELLER_DEV_PORT_START = Number(process.env.RESELLER_DEV_PORT_START || 3100);
const defaultThemeSettings = StoreSettings.defaultThemeSettings || {
  primaryColor: '#1f3c66',
  secondaryColor: '#d04b74',
  backgroundDefault: '#f6f7fb',
  backgroundPaper: '#ffffff',
  textPrimary: '#16233b',
  textSecondary: '#53617a',
  bodyFontFamily: 'Poppins',
  headingFontFamily: 'Playfair Display'
};
const defaultShowOutOfStockProducts = StoreSettings.defaultShowOutOfStockProducts || false;
const defaultFooterText = 'Premium everyday clothing, delivered across India.';
const {
  sanitizeSeoMeta,
  mergePublicPages,
  normalizeSeoKey,
  normalizePath
} = seoUtils;

let cache = {
  mtimeMs: 0,
  store: null
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeText = (value) => String(value || '').trim();

const normalizeHost = (value) => {
  let host = normalizeText(value).toLowerCase();
  if (!host) {
    return '';
  }

  host = host.replace(/^https?:\/\//i, '');
  host = host.split(',')[0].trim();
  host = host.split('/')[0];
  host = host.split('?')[0];
  host = host.replace(/\.+$/, '');
  host = host.replace(/:\d+$/, '');
  return host;
};

const isValidHost = (value) => {
  const host = normalizeHost(value);
  return Boolean(host && HOST_PATTERN.test(host));
};

const normalizeDomains = (value) => {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((entry) => entry.trim());

  const unique = new Set();
  for (const entry of list) {
    const host = normalizeHost(entry);
    if (host) {
      unique.add(host);
    }
  }

  return Array.from(unique);
};

const reorderDomainsWithPrimary = (primaryDomain, domains = []) => {
  const normalizedPrimary = normalizeHost(primaryDomain);
  const normalizedDomains = normalizeDomains(domains);
  if (!normalizedPrimary) {
    return normalizedDomains;
  }
  return [normalizedPrimary, ...normalizedDomains.filter((entry) => entry !== normalizedPrimary)];
};

const normalizeResellerPrimaryDomain = (reseller = {}) => {
  const fromPrimaryField = normalizeHost(reseller.primaryDomain);
  if (fromPrimaryField) {
    return fromPrimaryField;
  }

  const domains = normalizeDomains(reseller.domains);
  return domains[0] || '';
};

const normalizeMargin = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const clamped = Math.min(MAX_MARGIN_PERCENT, Math.max(0, numeric));
  return Number(clamped.toFixed(2));
};

const normalizeDevPort = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const rounded = Math.round(numeric);
  if (rounded < 1024 || rounded > 65535 || rounded === DEV_DEFAULT_PORT) {
    return 0;
  }
  return rounded;
};

const normalizeThemeSettings = (value = {}) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    primaryColor: String(source.primaryColor || defaultThemeSettings.primaryColor).trim() || defaultThemeSettings.primaryColor,
    secondaryColor: String(source.secondaryColor || defaultThemeSettings.secondaryColor).trim() || defaultThemeSettings.secondaryColor,
    backgroundDefault:
      String(source.backgroundDefault || defaultThemeSettings.backgroundDefault).trim() || defaultThemeSettings.backgroundDefault,
    backgroundPaper: String(source.backgroundPaper || defaultThemeSettings.backgroundPaper).trim() || defaultThemeSettings.backgroundPaper,
    textPrimary: String(source.textPrimary || defaultThemeSettings.textPrimary).trim() || defaultThemeSettings.textPrimary,
    textSecondary: String(source.textSecondary || defaultThemeSettings.textSecondary).trim() || defaultThemeSettings.textSecondary,
    bodyFontFamily: String(source.bodyFontFamily || defaultThemeSettings.bodyFontFamily).trim() || defaultThemeSettings.bodyFontFamily,
    headingFontFamily:
      String(source.headingFontFamily || defaultThemeSettings.headingFontFamily).trim() || defaultThemeSettings.headingFontFamily
  };
};

const normalizeResellerSettings = (value = {}, resellerName = '') => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const paymentGateways =
    source.paymentGateways && typeof source.paymentGateways === 'object' && !Array.isArray(source.paymentGateways)
      ? clone(source.paymentGateways)
      : null;
  return {
    storeName: String(source.storeName || '').trim() || String(resellerName || '').trim() || 'Clothing Store',
    footerText: String(source.footerText || '').trim() || defaultFooterText,
    showOutOfStockProducts:
      typeof source.showOutOfStockProducts === 'boolean'
        ? source.showOutOfStockProducts
        : defaultShowOutOfStockProducts,
    theme: normalizeThemeSettings(source.theme || {}),
    paymentGateways
  };
};

const normalizeResellerSeoSettings = (value = {}, resellerStoreName = 'Clothing Store') => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    defaults: sanitizeSeoMeta(source.defaults || {}),
    publicPages: mergePublicPages(source.publicPages || [], resellerStoreName)
  };
};

const nextAvailableDevPort = (usedPorts) => {
  let candidate = Math.max(1024, Math.round(RESELLER_DEV_PORT_START || 3100));
  while (usedPorts.has(candidate) || candidate === DEV_DEFAULT_PORT) {
    candidate += 1;
    if (candidate > 65535) {
      throw new Error('No free development ports are available for reseller websites');
    }
  }
  return candidate;
};

const assignMissingDevPorts = (resellers = []) => {
  const normalized = Array.isArray(resellers) ? resellers : [];
  const usedPorts = new Set();

  for (const reseller of normalized) {
    const existingPort = normalizeDevPort(reseller?.devPort);
    if (existingPort) {
      usedPorts.add(existingPort);
    }
  }

  return normalized.map((reseller) => {
    const existingPort = normalizeDevPort(reseller?.devPort);
    if (existingPort) {
      return {
        ...reseller,
        devPort: existingPort
      };
    }

    const allocated = nextAvailableDevPort(usedPorts);
    usedPorts.add(allocated);
    return {
      ...reseller,
      devPort: allocated
    };
  });
};

const ensureStoreFile = async () => {
  await fsp.mkdir(RESELLER_STORE_DIR, { recursive: true });
  if (!fs.existsSync(RESELLER_STORE_PATH)) {
    await fsp.writeFile(RESELLER_STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8');
  }
};

const parseStore = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return clone(DEFAULT_STORE);
    }

    const resellers = Array.isArray(parsed.resellers) ? parsed.resellers : [];
    return {
      version: Number(parsed.version || 1),
      updatedAt: parsed.updatedAt || null,
      resellers
    };
  } catch {
    return clone(DEFAULT_STORE);
  }
};

const readStore = async () => {
  await ensureStoreFile();
  const stat = await fsp.stat(RESELLER_STORE_PATH);

  if (cache.store && cache.mtimeMs === stat.mtimeMs) {
    return clone(cache.store);
  }

  const raw = await fsp.readFile(RESELLER_STORE_PATH, 'utf8');
  const parsed = parseStore(raw);
  cache = {
    mtimeMs: stat.mtimeMs,
    store: parsed
  };
  return clone(parsed);
};

const writeStore = async (nextStore) => {
  await ensureStoreFile();

  const normalized = {
    version: 1,
    updatedAt: new Date().toISOString(),
    resellers: Array.isArray(nextStore?.resellers) ? nextStore.resellers : []
  };

  const tmpFile = `${RESELLER_STORE_PATH}.tmp`;
  await fsp.writeFile(tmpFile, JSON.stringify(normalized, null, 2), 'utf8');
  await fsp.rename(tmpFile, RESELLER_STORE_PATH);

  const stat = await fsp.stat(RESELLER_STORE_PATH);
  cache = {
    mtimeMs: stat.mtimeMs,
    store: normalized
  };

  return clone(normalized);
};

const normalizeProductMargins = (value) => {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const next = {};

  for (const [productId, margin] of Object.entries(source)) {
    const normalizedProductId = normalizeText(productId);
    if (!PRODUCT_ID_PATTERN.test(normalizedProductId)) {
      continue;
    }
    next[normalizedProductId] = normalizeMargin(margin, 0);
  }

  return next;
};

const normalizeResellerRecord = (reseller = {}) => {
  const defaultMarginPercent = normalizeMargin(reseller.defaultMarginPercent, 0);
  const primaryDomain = normalizeResellerPrimaryDomain(reseller);
  const domains = reorderDomainsWithPrimary(primaryDomain, reseller.domains || []);
  const resellerName = normalizeText(reseller.name) || 'Reseller';
  const websiteName = normalizeText(reseller.websiteName);
  const displayStoreName = websiteName || resellerName;

  return {
    id: normalizeText(reseller.id),
    name: resellerName,
    websiteName,
    primaryDomain,
    domains,
    devPort: normalizeDevPort(reseller.devPort),
    adminUserId: normalizeText(reseller.adminUserId || ''),
    adminUserEmail: normalizeText(reseller.adminUserEmail || '').toLowerCase(),
    defaultMarginPercent,
    productMargins: normalizeProductMargins(reseller.productMargins),
    settings: normalizeResellerSettings(reseller.settings || {}, displayStoreName),
    seo: normalizeResellerSeoSettings(reseller.seo || {}, displayStoreName),
    isActive: reseller.isActive !== false,
    createdAt: reseller.createdAt || new Date().toISOString(),
    updatedAt: reseller.updatedAt || new Date().toISOString()
  };
};

const summarizeReseller = (reseller = {}) => {
  const normalized = normalizeResellerRecord(reseller);
  const isDev = process.env.NODE_ENV !== 'production';
  const devPreviewUrl = normalized.primaryDomain
    ? `http://${normalized.primaryDomain}:${DEV_DEFAULT_PORT}`
    : '';
  const devLocalUrl = normalized.devPort ? `http://localhost:${normalized.devPort}` : '';

  return {
    ...normalized,
    productMarginOverrides: Object.keys(normalized.productMargins || {}).length,
    devPreviewUrl: isDev ? devPreviewUrl : '',
    devLocalUrl: isDev ? devLocalUrl : '',
    settings: normalized.settings,
    seo: normalized.seo
  };
};

const assertUniqueDomains = (resellers) => {
  const domainToId = new Map();

  for (const reseller of resellers) {
    if (!reseller?.isActive) {
      continue;
    }
    const resellerId = normalizeText(reseller.id);
    const domains = Array.isArray(reseller.domains) ? reseller.domains : [];
    for (const domain of domains) {
      const normalizedDomain = normalizeHost(domain);
      if (!normalizedDomain) {
        continue;
      }

      const owner = domainToId.get(normalizedDomain);
      if (owner && owner !== resellerId) {
        throw new Error(`Domain "${normalizedDomain}" already belongs to another reseller`);
      }

      domainToId.set(normalizedDomain, resellerId);
    }
  }
};

const createReseller = async (payload = {}) => {
  const name = normalizeText(payload.name);
  const websiteName = normalizeText(payload.websiteName);
  const primaryDomain = normalizeHost(payload.primaryDomain);
  const domains = reorderDomainsWithPrimary(primaryDomain, payload.domains || payload.domain || []);
  const defaultMarginPercent = normalizeMargin(payload.defaultMarginPercent, 0);
  const isActive = payload.isActive !== false;

  if (!name) {
    throw new Error('Reseller name is required');
  }
  if (name.length > 120) {
    throw new Error('Reseller name must be 120 characters or less');
  }
  if (websiteName.length > 120) {
    throw new Error('Website name must be 120 characters or less');
  }
  if (domains.length === 0) {
    throw new Error('At least one reseller domain is required');
  }
  if (!primaryDomain) {
    throw new Error('Primary domain is required');
  }
  if (domains.some((domain) => !isValidHost(domain))) {
    throw new Error('Each domain must be a valid hostname');
  }

  const store = await readStore();
  const nextReseller = normalizeResellerRecord({
    id: crypto.randomUUID(),
    name,
    websiteName,
    primaryDomain,
    domains,
    adminUserId: normalizeText(payload.adminUserId || ''),
    adminUserEmail: normalizeText(payload.adminUserEmail || '').toLowerCase(),
    defaultMarginPercent,
    productMargins: {},
    settings: payload.settings || {},
    seo: payload.seo || {},
    isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const nextResellers = [...store.resellers.map((entry) => normalizeResellerRecord(entry)), nextReseller];
  const nextResellersWithPorts = assignMissingDevPorts(nextResellers);
  assertUniqueDomains(nextResellersWithPorts);

  await writeStore({
    ...store,
    resellers: nextResellersWithPorts
  });

  const created = nextResellersWithPorts.find((entry) => entry.id === nextReseller.id) || nextReseller;
  return summarizeReseller(created);
};

const updateReseller = async (resellerId, payload = {}) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = normalizedResellers.findIndex((entry) => entry.id === targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const hasName = Object.prototype.hasOwnProperty.call(payload, 'name');
  const hasWebsiteName = Object.prototype.hasOwnProperty.call(payload, 'websiteName');
  const hasPrimaryDomain = Object.prototype.hasOwnProperty.call(payload, 'primaryDomain');
  const hasDomains = Object.prototype.hasOwnProperty.call(payload, 'domains') || Object.prototype.hasOwnProperty.call(payload, 'domain');
  const hasDefaultMargin = Object.prototype.hasOwnProperty.call(payload, 'defaultMarginPercent');
  const hasIsActive = Object.prototype.hasOwnProperty.call(payload, 'isActive');
  const hasDevPort = Object.prototype.hasOwnProperty.call(payload, 'devPort');
  const hasAdminUserId = Object.prototype.hasOwnProperty.call(payload, 'adminUserId');
  const hasAdminUserEmail = Object.prototype.hasOwnProperty.call(payload, 'adminUserEmail');

  const requestedPrimaryDomain = hasPrimaryDomain
    ? normalizeHost(payload.primaryDomain)
    : current.primaryDomain;
  const requestedDomains = hasDomains ? payload.domains || payload.domain || [] : current.domains;
  const mergedDomains = reorderDomainsWithPrimary(requestedPrimaryDomain, requestedDomains);

  const next = normalizeResellerRecord({
    ...current,
    name: hasName ? normalizeText(payload.name) : current.name,
    websiteName: hasWebsiteName ? normalizeText(payload.websiteName) : current.websiteName,
    primaryDomain: requestedPrimaryDomain,
    domains: mergedDomains,
    devPort: hasDevPort ? normalizeDevPort(payload.devPort) : current.devPort,
    adminUserId: hasAdminUserId ? normalizeText(payload.adminUserId) : current.adminUserId,
    adminUserEmail: hasAdminUserEmail ? normalizeText(payload.adminUserEmail).toLowerCase() : current.adminUserEmail,
    defaultMarginPercent: hasDefaultMargin
      ? normalizeMargin(payload.defaultMarginPercent, current.defaultMarginPercent)
      : current.defaultMarginPercent,
    isActive: hasIsActive ? Boolean(payload.isActive) : current.isActive,
    updatedAt: new Date().toISOString()
  });

  if (!next.name) {
    throw new Error('Reseller name is required');
  }
  if (next.name.length > 120) {
    throw new Error('Reseller name must be 120 characters or less');
  }
  if (next.websiteName.length > 120) {
    throw new Error('Website name must be 120 characters or less');
  }
  if (next.domains.length === 0) {
    throw new Error('At least one reseller domain is required');
  }
  if (!next.primaryDomain) {
    throw new Error('Primary domain is required');
  }
  if (next.domains.some((domain) => !isValidHost(domain))) {
    throw new Error('Each domain must be a valid hostname');
  }

  const nextResellers = normalizedResellers.map((entry, entryIndex) => (entryIndex === index ? next : entry));
  const nextResellersWithPorts = assignMissingDevPorts(nextResellers);
  assertUniqueDomains(nextResellersWithPorts);

  await writeStore({
    ...store,
    resellers: nextResellersWithPorts
  });

  const updated = nextResellersWithPorts.find((entry) => entry.id === targetId) || next;
  return summarizeReseller(updated);
};

const deleteReseller = async (resellerId) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = normalizedResellers.findIndex((entry) => entry.id === targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const [removed] = normalizedResellers.splice(index, 1);
  await writeStore({
    ...store,
    resellers: normalizedResellers
  });

  return summarizeReseller(removed);
};

const setResellerDefaultMargin = async (resellerId, marginPercent, options = {}) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = normalizedResellers.findIndex((entry) => entry.id === targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const clearProductOverrides = Boolean(options?.clearProductOverrides);
  const next = normalizeResellerRecord({
    ...current,
    defaultMarginPercent: normalizeMargin(marginPercent, current.defaultMarginPercent),
    productMargins: clearProductOverrides ? {} : current.productMargins,
    updatedAt: new Date().toISOString()
  });

  normalizedResellers[index] = next;
  const nextResellersWithPorts = assignMissingDevPorts(normalizedResellers);
  await writeStore({
    ...store,
    resellers: nextResellersWithPorts
  });

  const updated = nextResellersWithPorts.find((entry) => entry.id === targetId) || next;
  return summarizeReseller(updated);
};

const setResellerProductMargins = async (resellerId, updates = []) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error('At least one product margin update is required');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = normalizedResellers.findIndex((entry) => entry.id === targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const nextProductMargins = {
    ...(current.productMargins || {})
  };

  for (const update of updates) {
    const productId = normalizeText(update?.productId);
    if (!PRODUCT_ID_PATTERN.test(productId)) {
      throw new Error('Invalid product id in product margin updates');
    }

    const remove = Boolean(update?.remove);
    if (remove) {
      delete nextProductMargins[productId];
      continue;
    }

    nextProductMargins[productId] = normalizeMargin(update?.marginPercent, current.defaultMarginPercent);
  }

  const next = normalizeResellerRecord({
    ...current,
    productMargins: nextProductMargins,
    updatedAt: new Date().toISOString()
  });

  normalizedResellers[index] = next;
  const nextResellersWithPorts = assignMissingDevPorts(normalizedResellers);
  await writeStore({
    ...store,
    resellers: nextResellersWithPorts
  });

  const updated = nextResellersWithPorts.find((entry) => entry.id === targetId) || next;
  return summarizeReseller(updated);
};

const findResellerIndexById = (resellers, resellerId) =>
  resellers.findIndex((entry) => String(entry?.id || '').trim() === String(resellerId || '').trim());

const getResellerSettingsById = async (resellerId) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    return null;
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const reseller = normalizedResellers.find((entry) => entry.id === targetId);
  if (!reseller) {
    return null;
  }
  return {
    reseller: summarizeReseller(reseller),
    settings: normalizeResellerSettings(reseller.settings || {}, reseller.websiteName || reseller.name)
  };
};

const updateResellerSettingsById = async (resellerId, payload = {}) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  if (Object.keys(source).length === 0) {
    throw new Error('No reseller settings fields were provided');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = findResellerIndexById(normalizedResellers, targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const currentSettings = normalizeResellerSettings(current.settings || {}, current.websiteName || current.name);
  const nextSettings = normalizeResellerSettings(
    {
      ...currentSettings,
      ...source,
      theme: source.theme !== undefined ? { ...currentSettings.theme, ...(source.theme || {}) } : currentSettings.theme
    },
    current.websiteName || current.name
  );

  const next = normalizeResellerRecord({
    ...current,
    settings: nextSettings,
    updatedAt: new Date().toISOString()
  });

  normalizedResellers[index] = next;
  await writeStore({
    ...store,
    resellers: normalizedResellers
  });

  return {
    reseller: summarizeReseller(next),
    settings: nextSettings
  };
};

const getResellerSeoById = async (resellerId) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    return null;
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const reseller = normalizedResellers.find((entry) => entry.id === targetId);
  if (!reseller) {
    return null;
  }
  const seo = normalizeResellerSeoSettings(reseller.seo || {}, reseller.websiteName || reseller.name);
  return {
    reseller: summarizeReseller(reseller),
    seo
  };
};

const updateResellerSeoDefaultsById = async (resellerId, defaults = {}) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = findResellerIndexById(normalizedResellers, targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const currentSeo = normalizeResellerSeoSettings(current.seo || {}, current.websiteName || current.name);
  const nextSeo = {
    ...currentSeo,
    defaults: sanitizeSeoMeta(defaults || {})
  };

  const next = normalizeResellerRecord({
    ...current,
    seo: nextSeo,
    updatedAt: new Date().toISOString()
  });

  normalizedResellers[index] = next;
  await writeStore({
    ...store,
    resellers: normalizedResellers
  });

  return {
    reseller: summarizeReseller(next),
    seo: nextSeo
  };
};

const upsertResellerPublicPageSeoById = async (resellerId, payload = {}) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }

  const key = normalizeSeoKey(payload?.key);
  const pathValue = normalizePath(payload?.path);
  const label = String(payload?.label || '').trim().slice(0, 80);

  if (!key) {
    throw new Error('Page key is required');
  }
  if (!label) {
    throw new Error('Page label is required');
  }
  if (!pathValue) {
    throw new Error('Page path is required');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = findResellerIndexById(normalizedResellers, targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const currentSeo = normalizeResellerSeoSettings(current.seo || {}, current.websiteName || current.name);
  const pages = Array.isArray(currentSeo.publicPages) ? [...currentSeo.publicPages] : [];
  const existingByPath = pages.find((page) => page.path === pathValue && page.key !== key);
  if (existingByPath) {
    throw new Error(`Path already mapped to "${existingByPath.label}"`);
  }

  const meta = sanitizeSeoMeta(payload?.meta || {});
  const existingIndex = pages.findIndex((page) => page.key === key);
  if (existingIndex >= 0) {
    pages[existingIndex] = {
      ...pages[existingIndex],
      key,
      label,
      path: pathValue,
      meta
    };
  } else {
    pages.push({
      key,
      label,
      path: pathValue,
      meta
    });
  }

  const nextSeo = normalizeResellerSeoSettings(
    {
      ...currentSeo,
      publicPages: pages
    },
    current.websiteName || current.name
  );

  const next = normalizeResellerRecord({
    ...current,
    seo: nextSeo,
    updatedAt: new Date().toISOString()
  });

  normalizedResellers[index] = next;
  await writeStore({
    ...store,
    resellers: normalizedResellers
  });

  return {
    reseller: summarizeReseller(next),
    seo: nextSeo
  };
};

const deleteResellerPublicPageSeoById = async (resellerId, pageKey) => {
  const targetId = normalizeText(resellerId);
  const key = normalizeSeoKey(pageKey);
  if (!targetId) {
    throw new Error('Reseller id is required');
  }
  if (!key) {
    throw new Error('Page key is required');
  }

  const protectedPages = new Set(['home', 'wishlist', 'cart', 'login', 'register', 'checkout', 'orders']);
  if (protectedPages.has(key)) {
    throw new Error('Default public pages cannot be deleted');
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const index = findResellerIndexById(normalizedResellers, targetId);
  if (index < 0) {
    throw new Error('Reseller not found');
  }

  const current = normalizedResellers[index];
  const currentSeo = normalizeResellerSeoSettings(current.seo || {}, current.websiteName || current.name);
  const pages = Array.isArray(currentSeo.publicPages) ? currentSeo.publicPages : [];
  const nextPages = pages.filter((page) => page.key !== key);
  if (nextPages.length === pages.length) {
    throw new Error('SEO page configuration not found');
  }

  const nextSeo = normalizeResellerSeoSettings(
    {
      ...currentSeo,
      publicPages: nextPages
    },
    current.websiteName || current.name
  );

  const next = normalizeResellerRecord({
    ...current,
    seo: nextSeo,
    updatedAt: new Date().toISOString()
  });

  normalizedResellers[index] = next;
  await writeStore({
    ...store,
    resellers: normalizedResellers
  });

  return {
    reseller: summarizeReseller(next),
    seo: nextSeo
  };
};

const getResellerById = async (resellerId) => {
  const targetId = normalizeText(resellerId);
  if (!targetId) {
    return null;
  }

  const store = await readStore();
  const reseller = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)))
    .find((entry) => entry.id === targetId);

  return reseller ? summarizeReseller(reseller) : null;
};

const listResellers = async () => {
  const store = await readStore();
  const normalized = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)))
    .map((entry) => summarizeReseller(entry));
  normalized.sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
  return normalized;
};

const resolveRequestHost = (req) => {
  const forwardedHost = normalizeText(req?.headers?.['x-forwarded-host'] || '');
  const hostHeader = normalizeText(req?.headers?.host || '');
  const rawHost = forwardedHost || hostHeader;
  return normalizeHost(rawHost);
};

const findResellerByHost = async (host) => {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost) {
    return null;
  }

  const store = await readStore();
  const normalizedResellers = assignMissingDevPorts(store.resellers.map((entry) => normalizeResellerRecord(entry)));
  const reseller = normalizedResellers.find(
    (entry) => entry.isActive && Array.isArray(entry.domains) && entry.domains.includes(normalizedHost)
  );

  if (!reseller) {
    return null;
  }

  return summarizeReseller(reseller);
};

module.exports = {
  PRODUCT_ID_PATTERN,
  normalizeHost,
  normalizeMargin,
  normalizeDomains,
  resolveRequestHost,
  listResellers,
  createReseller,
  updateReseller,
  deleteReseller,
  setResellerDefaultMargin,
  setResellerProductMargins,
  getResellerSettingsById,
  updateResellerSettingsById,
  getResellerSeoById,
  updateResellerSeoDefaultsById,
  upsertResellerPublicPageSeoById,
  deleteResellerPublicPageSeoById,
  getResellerById,
  findResellerByHost
};
