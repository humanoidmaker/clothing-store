const MediaAsset = require('../models/MediaAsset');

const isValidImageUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return false;

  if (url.startsWith('data:image/')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
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
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt
});

const listMediaAssets = async (req, res) => {
  const queryText = String(req.query.q || '').trim();
  const limitRaw = Number(req.query.limit || 120);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 120;

  const query = {};
  if (queryText) {
    const pattern = { $regex: queryText, $options: 'i' };
    query.$or = [{ name: pattern }, { altText: pattern }, { url: pattern }];
  }

  const assets = await MediaAsset.find(query).sort({ updatedAt: -1 }).limit(limit);
  return res.json(assets.map(toResponse));
};

const createMediaAssets = async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [req.body];
  const sanitized = items.map(normalizeAssetInput);

  if (sanitized.length === 0) {
    return res.status(400).json({ message: 'At least one media item is required' });
  }

  for (const item of sanitized) {
    if (!isValidImageUrl(item.url)) {
      return res.status(400).json({ message: 'Each media item must have a valid image URL or data URL' });
    }
  }

  const payload = sanitized.map((item) => ({
    ...item,
    createdBy: req.user?._id
  }));

  const created = await MediaAsset.insertMany(payload);
  return res.status(201).json(created.map(toResponse));
};

const updateMediaAsset = async (req, res) => {
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: 'Media asset not found' });
  }

  const nextName = req.body?.name !== undefined ? String(req.body.name || '').trim().slice(0, 120) : asset.name;
  const nextAltText = req.body?.altText !== undefined ? String(req.body.altText || '').trim().slice(0, 220) : asset.altText;
  const nextUrl = req.body?.url !== undefined ? String(req.body.url || '').trim() : asset.url;
  const nextMimeType = req.body?.mimeType !== undefined ? String(req.body.mimeType || '').trim().slice(0, 120) : asset.mimeType;
  const nextSource = req.body?.source !== undefined ? String(req.body.source || '').trim().slice(0, 40) : asset.source;

  if (!nextName) {
    return res.status(400).json({ message: 'Media name is required' });
  }

  if (!isValidImageUrl(nextUrl)) {
    return res.status(400).json({ message: 'Media URL must be a valid image URL or data URL' });
  }

  asset.name = nextName;
  asset.altText = nextAltText;
  asset.url = nextUrl;
  asset.mimeType = nextMimeType;
  asset.source = nextSource || 'upload';
  await asset.save();

  return res.json(toResponse(asset));
};

const deleteMediaAsset = async (req, res) => {
  const asset = await MediaAsset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: 'Media asset not found' });
  }

  await asset.deleteOne();
  return res.json({ message: 'Media asset deleted' });
};

module.exports = {
  listMediaAssets,
  createMediaAssets,
  updateMediaAsset,
  deleteMediaAsset
};
