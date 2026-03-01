const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/;
const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

const toPosixPath = (value) => String(value || '').replace(/\\/g, '/');

const getMediaStorageRoot = () => {
  const configured = String(process.env.MEDIA_STORAGE_DIR || '').trim();
  const fallback = path.join(process.cwd(), 'storage', 'media');
  return path.resolve(configured ? configured : fallback);
};

const getMediaPublicBase = () => {
  const cdnBase = String(process.env.MEDIA_CDN_BASE_URL || '').trim().replace(/\/+$/, '');
  if (cdnBase) {
    return cdnBase;
  }

  const publicPath = String(process.env.MEDIA_PUBLIC_BASE_PATH || '/storage/media').trim();
  if (/^https?:\/\//i.test(publicPath)) {
    return publicPath.replace(/\/+$/, '');
  }
  return `/${publicPath.replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const buildPublicMediaUrl = (relativeStoragePath) => {
  const normalizedRelative = toPosixPath(relativeStoragePath).replace(/^\/+/, '');
  const base = getMediaPublicBase();
  return `${base}/${normalizedRelative}`;
};

const parseImageDataUrl = (dataUrl) => {
  const normalized = String(dataUrl || '').trim();
  const match = normalized.match(DATA_URL_PATTERN);
  if (!match) {
    throw new Error('Invalid image data URL');
  }

  const mimeType = String(match[1] || '').toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(MIME_TO_EXTENSION, mimeType)) {
    throw new Error('Unsupported image mime type');
  }

  const rawBase64 = String(match[2] || '').replace(/\s+/g, '');
  const buffer = Buffer.from(rawBase64, 'base64');
  if (!buffer.length) {
    throw new Error('Image data is empty');
  }

  return { mimeType, buffer };
};

const createRelativeStoragePath = (mimeType) => {
  const extension = MIME_TO_EXTENSION[mimeType] || 'bin';
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const randomId = crypto.randomBytes(10).toString('hex');
  const fileName = `${Date.now()}_${randomId}.${extension}`;
  return path.join(year, month, day, fileName);
};

const resolveAbsoluteStoragePath = (relativeStoragePath) => {
  const root = getMediaStorageRoot();
  const candidate = path.resolve(root, relativeStoragePath);
  const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

  if (candidate !== root && !candidate.startsWith(rootWithSeparator)) {
    throw new Error('Invalid storage path');
  }

  return candidate;
};

const saveImageDataUrlToStorage = async (dataUrl) => {
  const { mimeType, buffer } = parseImageDataUrl(dataUrl);
  const relativeStoragePath = createRelativeStoragePath(mimeType);
  const absoluteStoragePath = resolveAbsoluteStoragePath(relativeStoragePath);

  await fs.mkdir(path.dirname(absoluteStoragePath), { recursive: true });
  await fs.writeFile(absoluteStoragePath, buffer);

  return {
    mimeType,
    sizeBytes: buffer.length,
    storagePath: toPosixPath(relativeStoragePath),
    url: buildPublicMediaUrl(relativeStoragePath)
  };
};

const deleteMediaFileFromStorage = async (relativeStoragePath) => {
  const normalized = String(relativeStoragePath || '').trim();
  if (!normalized) {
    return;
  }

  const absoluteStoragePath = resolveAbsoluteStoragePath(normalized);
  await fs.rm(absoluteStoragePath, { force: true });
};

const isDataImageUrl = (value) => DATA_URL_PATTERN.test(String(value || '').trim());

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

module.exports = {
  getMediaStorageRoot,
  getMediaPublicBase,
  buildPublicMediaUrl,
  saveImageDataUrlToStorage,
  deleteMediaFileFromStorage,
  isDataImageUrl,
  isHttpUrl
};
