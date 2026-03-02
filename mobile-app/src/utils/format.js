export const normalizeText = (value) => String(value || '').trim();

export const stripHtml = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const toDateLabel = (value) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    });
  } catch {
    return '-';
  }
};

export const toDateTimeLabel = (value) => {
  if (!value) {
    return '-';
  }

  try {
    return new Date(value).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const withAllOption = (items = []) => ['All', ...items.filter(Boolean)];
