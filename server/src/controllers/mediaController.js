const MediaAsset = require('../models/MediaAsset');
const { getResellerById } = require('../utils/resellerStore');
const {
  saveImageDataUrlToStorage,
  deleteMediaFileFromStorage,
  isDataImageUrl,
  isHttpUrl
} = require('../utils/mediaStorage');

const trimOrEmpty = (value) => String(value || '').trim();
const buildGlobalMediaScopeQuery = () => ({
  $or: [
    { resellerId: { $exists: false } },
    { resellerId: '' },
    { resellerId: null }
  ]
});

const isResellerScopedUser = (user) =>
  !Boolean(user?.isAdmin) && Boolean(user?.isResellerAdmin) && Boolean(trimOrEmpty(user?.resellerId || ''));

const getMediaScope = async (user = {}) => {
  if (user?.isAdmin) {
    return {
      resellerId: '',
      resellerName: '',
      query: buildGlobalMediaScopeQuery()
    };
  }

  if (isResellerScopedUser(user)) {
    const resellerId = trimOrEmpty(user?.resellerId || '');
    const reseller = await getResellerById(resellerId);
    return {
      resellerId,
      resellerName: trimOrEmpty(reseller?.websiteName || reseller?.name || ''),
      query: { resellerId }
    };
  }

  return {
    resellerId: '',
    resellerName: '',
    query: { _id: { $exists: false } }
  };
};

const canAccessAssetForScope = (asset, scope = {}) => {
  const scopeResellerId = trimOrEmpty(scope?.resellerId || '');
  const assetResellerId = trimOrEmpty(asset?.resellerId || '');
  if (!scopeResellerId) {
    return !assetResellerId;
  }
  return assetResellerId === scopeResellerId;
};

const normalizeAssetInput = (input = {}) => {
  const name = String(input.name || 'Image').trim().slice(0, 120) || 'Image';
  const altText = String(input.altText || '').trim().slice(0, 220);
  const url = String(input.url || '').trim();
  const mimeType = String(input.mimeType || '').trim().slice(0, 120);
  const source = String(input.source || 'upload').trim().slice(0, 40) || 'upload';

  return { name, altText, url, mimeType, source };
};

const toResponse = (asset) => ({
  _id: asset._id,
  name: asset.name,
  altText: asset.altText || '',
  url: asset.url,
  mimeType: asset.mimeType || '',
  source: asset.source || 'upload',
  resellerId: String(asset.resellerId || '').trim(),
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt
});

const deleteAssetFileIfUnused = async (asset) => {
  const storagePath = String(asset?.storagePath || '').trim();
  if (!storagePath) {
    return;
  }

  const inUseCount = await MediaAsset.countDocuments({
    storagePath,
    _id: { $ne: asset._id }
  });

  if (inUseCount === 0) {
    await deleteMediaFileFromStorage(storagePath);
  }
};

const listMediaAssets = async (req, res) => {
  const scope = await getMediaScope(req.user || {});
  const queryText = String(req.query.q || '').trim();
  const limitRaw = Number(req.query.limit || 120);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 120;

  const query = scope.query && Object.keys(scope.query).length > 0 ? { ...scope.query } : {};
  if (queryText) {
    const pattern = { $regex: queryText, $options: 'i' };
    const searchQuery = { $or: [{ name: pattern }, { altText: pattern }, { url: pattern }] };
    if (Object.keys(query).length > 0) {
      query.$and = [scope.query, searchQuery];
      delete query.$or;
    } else {
      query.$or = searchQuery.$or;
    }
  }

  const assets = await MediaAsset.find(query).sort({ updatedAt: -1 }).limit(limit);
  return res.json(assets.map(toResponse));
};

const createMediaAssets = async (req, res) => {
  const scope = await getMediaScope(req.user || {});
  const items = Array.isArray(req.body?.items) ? req.body.items : [req.body];
  const sanitized = items.map(normalizeAssetInput);

  if (sanitized.length === 0) {
    return res.status(400).json({ message: 'At least one media item is required' });
  }

  const payload = [];
  for (const item of sanitized) {
    if (!item.url) {
      return res.status(400).json({ message: 'Each media item must include an image URL or data URL' });
    }

    if (isDataImageUrl(item.url)) {
      const stored = await saveImageDataUrlToStorage(item.url);
      payload.push({
        name: item.name,
        altText: item.altText,
        url: stored.url,
        storagePath: stored.storagePath,
        sizeBytes: stored.sizeBytes,
        mimeType: stored.mimeType,
        source: item.source || 'upload',
        createdBy: req.user?._id,
        resellerId: scope.resellerId,
        resellerName: scope.resellerName
      });
      continue;
    }

    if (!isHttpUrl(item.url)) {
      return res.status(400).json({ message: 'Media URL must be a valid http(s) URL or image data URL' });
    }

    payload.push({
      name: item.name,
      altText: item.altText,
      url: item.url,
      storagePath: '',
      sizeBytes: 0,
      mimeType: item.mimeType,
      source: item.source || 'external',
      createdBy: req.user?._id,
      resellerId: scope.resellerId,
      resellerName: scope.resellerName
    });
  }

  const created = await MediaAsset.insertMany(payload);
  return res.status(201).json(created.map(toResponse));
};

const updateMediaAsset = async (req, res) => {
  const scope = await getMediaScope(req.user || {});
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: 'Media asset not found' });
  }
  if (!canAccessAssetForScope(asset, scope)) {
    return res.status(404).json({ message: 'Media asset not found' });
  }

  const nextName = req.body?.name !== undefined ? String(req.body.name || '').trim().slice(0, 120) : asset.name;
  const nextAltText = req.body?.altText !== undefined ? String(req.body.altText || '').trim().slice(0, 220) : asset.altText;
  const nextSource = req.body?.source !== undefined ? String(req.body.source || '').trim().slice(0, 40) : asset.source;
  const hasUrlUpdate = req.body?.url !== undefined;
  const nextUrlInput = hasUrlUpdate ? String(req.body.url || '').trim() : asset.url;

  if (!nextName) {
    return res.status(400).json({ message: 'Media name is required' });
  }

  if (hasUrlUpdate) {
    if (!nextUrlInput) {
      return res.status(400).json({ message: 'Media URL is required' });
    }

    if (isDataImageUrl(nextUrlInput)) {
      const stored = await saveImageDataUrlToStorage(nextUrlInput);
      const previousAssetSnapshot = {
        _id: asset._id,
        storagePath: asset.storagePath
      };

      asset.url = stored.url;
      asset.storagePath = stored.storagePath;
      asset.sizeBytes = stored.sizeBytes;
      asset.mimeType = stored.mimeType;
      asset.source = nextSource || 'upload';
      asset.name = nextName;
      asset.altText = nextAltText;
      await asset.save();

      await deleteAssetFileIfUnused(previousAssetSnapshot);
      return res.json(toResponse(asset));
    }

    if (!isHttpUrl(nextUrlInput)) {
      return res.status(400).json({ message: 'Media URL must be a valid http(s) URL or image data URL' });
    }

    const previousAssetSnapshot = {
      _id: asset._id,
      storagePath: asset.storagePath
    };

    asset.url = nextUrlInput;
    asset.storagePath = '';
    asset.sizeBytes = 0;
    asset.mimeType =
      req.body?.mimeType !== undefined ? String(req.body.mimeType || '').trim().slice(0, 120) : asset.mimeType;
    asset.source = nextSource || 'external';
    asset.name = nextName;
    asset.altText = nextAltText;
    await asset.save();

    await deleteAssetFileIfUnused(previousAssetSnapshot);
    return res.json(toResponse(asset));
  }

  asset.name = nextName;
  asset.altText = nextAltText;
  asset.source = nextSource || asset.source || 'upload';
  if (req.body?.mimeType !== undefined) {
    asset.mimeType = String(req.body.mimeType || '').trim().slice(0, 120);
  }
  await asset.save();

  return res.json(toResponse(asset));
};

const deleteMediaAsset = async (req, res) => {
  const scope = await getMediaScope(req.user || {});
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: 'Media asset not found' });
  }
  if (!canAccessAssetForScope(asset, scope)) {
    return res.status(404).json({ message: 'Media asset not found' });
  }

  const previousAssetSnapshot = {
    _id: asset._id,
    storagePath: asset.storagePath
  };

  await asset.deleteOne();
  await deleteAssetFileIfUnused(previousAssetSnapshot);
  return res.json({ message: 'Media asset deleted' });
};

module.exports = {
  listMediaAssets,
  createMediaAssets,
  updateMediaAsset,
  deleteMediaAsset
};
