import { normalizeText } from './format';

export const isEmail = (value) => {
  const email = normalizeText(value).toLowerCase();
  if (!email) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const requireFields = (fields = [], data = {}) => {
  for (const field of fields) {
    if (!normalizeText(data[field])) {
      return `${field} is required`;
    }
  }
  return '';
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (String(password || '').length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (String(password || '') !== String(confirmPassword || '')) {
    return 'Passwords do not match';
  }
  return '';
};

export const normalizeMarginNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Number(fallback || 0);
  }
  const clamped = Math.max(0, Math.min(1000, parsed));
  return Number(clamped.toFixed(2));
};
