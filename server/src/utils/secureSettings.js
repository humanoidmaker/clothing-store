const crypto = require('crypto');

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_SIZE_BYTES = 12;
const KEY_DERIVATION_SALT = 'store-settings:razorpay:v1';

const getEncryptionSecret = () => {
  const rawSecret = String(process.env.SETTINGS_ENCRYPTION_SECRET || process.env.JWT_SECRET || '').trim();
  if (!rawSecret) {
    throw new Error('SETTINGS_ENCRYPTION_SECRET is not configured on server');
  }
  return rawSecret;
};

const getCipherKey = () =>
  crypto
    .createHash('sha256')
    .update(`${KEY_DERIVATION_SALT}:${getEncryptionSecret()}`)
    .digest();

const encryptSettingValue = (value) => {
  const plainText = String(value || '');
  if (!plainText) {
    return '';
  }

  const key = getCipherKey();
  const iv = crypto.randomBytes(IV_SIZE_BYTES);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encryptedBytes = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('base64'), authTag.toString('base64'), encryptedBytes.toString('base64')].join(':');
};

const decryptSettingValue = (encryptedValue) => {
  const normalized = String(encryptedValue || '').trim();
  if (!normalized) {
    return '';
  }

  const parts = normalized.split(':');
  if (parts.length !== 3) {
    throw new Error('Stored secret has an invalid format');
  }

  const [ivBase64, authTagBase64, cipherTextBase64] = parts;
  const key = getCipherKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const cipherText = Buffer.from(cipherTextBase64, 'base64');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decryptedBytes = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decryptedBytes.toString('utf8');
};

module.exports = {
  encryptSettingValue,
  decryptSettingValue
};
