const DEFAULT_ROBOTS = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
const DEFAULT_TWITTER_CARD = 'summary_large_image';
const DEFAULT_OG_TYPE = 'website';
const DEFAULT_SOCIAL_IMAGE = 'https://placehold.co/1200x630?text=Astra+Attire';
const DEFAULT_SITE_URL = 'http://localhost:3000';

const PREDEFINED_PUBLIC_PAGES = [
  { key: 'home', label: 'Home Page', path: '/' },
  { key: 'wishlist', label: 'Wishlist Page', path: '/wishlist' },
  { key: 'cart', label: 'Cart Page', path: '/cart' },
  { key: 'login', label: 'Login Page', path: '/login' },
  { key: 'register', label: 'Register Page', path: '/register' },
  { key: 'checkout', label: 'Checkout Page', path: '/checkout' },
  { key: 'orders', label: 'Orders Page', path: '/orders' }
];

const defaultSeoMeta = {
  title: '',
  description: '',
  keywords: '',
  canonicalUrl: '',
  robots: DEFAULT_ROBOTS,
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogImageAlt: '',
  ogType: DEFAULT_OG_TYPE,
  twitterCard: DEFAULT_TWITTER_CARD,
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  twitterImageAlt: '',
  twitterSite: '',
  twitterCreator: ''
};

const trimValue = (value) => String(value || '').trim();

const clampText = (value, maxLength) => trimValue(value).slice(0, maxLength);

const normalizePath = (value) => {
  const raw = trimValue(value);
  if (!raw) return '/';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
};

const normalizeSeoKey = (value) => {
  const normalized = trimValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, 60);
};

const sanitizeTwitterHandle = (value) => {
  const raw = trimValue(value);
  if (!raw) return '';
  if (raw.startsWith('@')) return raw.slice(0, 30);
  return `@${raw.slice(0, 29)}`;
};

const sanitizeSeoMeta = (input = {}, fallback = defaultSeoMeta) => ({
  title: clampText(input.title ?? fallback.title, 120),
  description: clampText(input.description ?? fallback.description, 320),
  keywords: clampText(input.keywords ?? fallback.keywords, 320),
  canonicalUrl: clampText(input.canonicalUrl ?? fallback.canonicalUrl, 500),
  robots: clampText(input.robots ?? (fallback.robots || DEFAULT_ROBOTS), 220) || DEFAULT_ROBOTS,
  ogTitle: clampText(input.ogTitle ?? fallback.ogTitle, 120),
  ogDescription: clampText(input.ogDescription ?? fallback.ogDescription, 320),
  ogImage: clampText(input.ogImage ?? fallback.ogImage, 1000),
  ogImageAlt: clampText(input.ogImageAlt ?? fallback.ogImageAlt, 420),
  ogType: clampText(input.ogType ?? (fallback.ogType || DEFAULT_OG_TYPE), 60) || DEFAULT_OG_TYPE,
  twitterCard: clampText(
    input.twitterCard ?? (fallback.twitterCard || DEFAULT_TWITTER_CARD),
    40
  ) || DEFAULT_TWITTER_CARD,
  twitterTitle: clampText(input.twitterTitle ?? fallback.twitterTitle, 120),
  twitterDescription: clampText(input.twitterDescription ?? fallback.twitterDescription, 200),
  twitterImage: clampText(input.twitterImage ?? fallback.twitterImage, 1000),
  twitterImageAlt: clampText(input.twitterImageAlt ?? fallback.twitterImageAlt, 420),
  twitterSite: sanitizeTwitterHandle(input.twitterSite ?? fallback.twitterSite),
  twitterCreator: sanitizeTwitterHandle(input.twitterCreator ?? fallback.twitterCreator)
});

const createDefaultPublicPageMeta = (page, storeName = 'Astra Attire') => {
  const titleBase =
    page.key === 'home' ? `${storeName} | Premium Fashion Store` : `${page.label} | ${storeName}`;
  const descriptionBase =
    page.key === 'home'
      ? `Explore ${storeName} for premium fashion, fast checkout and secure shopping.`
      : `Browse ${page.label.toLowerCase()} on ${storeName}.`;

  return sanitizeSeoMeta({
    title: titleBase,
    description: descriptionBase,
    ogTitle: titleBase,
    ogDescription: descriptionBase,
    ogType: 'website',
    twitterCard: DEFAULT_TWITTER_CARD,
    twitterTitle: titleBase,
    twitterDescription: descriptionBase
  });
};

const buildDefaultPublicPages = (storeName = 'Astra Attire') =>
  PREDEFINED_PUBLIC_PAGES.map((page) => ({
    key: page.key,
    label: page.label,
    path: page.path,
    meta: createDefaultPublicPageMeta(page, storeName)
  }));

const mergePublicPages = (existingPages = [], storeName = 'Astra Attire') => {
  const defaults = buildDefaultPublicPages(storeName);
  const normalizedExisting = Array.isArray(existingPages)
    ? existingPages
      .map((page) => ({
        key: normalizeSeoKey(page?.key),
        label: clampText(page?.label, 80),
        path: normalizePath(page?.path),
        meta: sanitizeSeoMeta(page?.meta || {})
      }))
      .filter((page) => page.key && page.path)
    : [];

  const byKey = new Map();
  for (const page of normalizedExisting) {
    byKey.set(page.key, page);
  }

  for (const page of defaults) {
    if (!byKey.has(page.key)) {
      byKey.set(page.key, page);
      continue;
    }

    const current = byKey.get(page.key);
    byKey.set(page.key, {
      ...current,
      label: current.label || page.label,
      path: current.path || page.path,
      meta: sanitizeSeoMeta(current.meta || {}, page.meta)
    });
  }

  return Array.from(byKey.values());
};

const buildAbsoluteUrl = (origin, value) => {
  const raw = trimValue(value);
  if (!raw) return '';

  try {
    return new URL(raw, origin || DEFAULT_SITE_URL).toString();
  } catch {
    return '';
  }
};

const stripHtml = (value) => trimValue(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const resolveSeoForRendering = ({
  meta = {},
  fallbackMeta = {},
  titleFallback = '',
  descriptionFallback = '',
  imageFallback = '',
  pathname = '/',
  origin = DEFAULT_SITE_URL,
  siteName = 'Astra Attire',
  typeFallback = DEFAULT_OG_TYPE
}) => {
  const normalizedPrimary = sanitizeSeoMeta(meta || {});
  const normalizedFallback = sanitizeSeoMeta(fallbackMeta || {});
  const merged = sanitizeSeoMeta(normalizedPrimary, normalizedFallback);

  const canonicalUrl = buildAbsoluteUrl(origin, merged.canonicalUrl || pathname) || `${origin}${normalizePath(pathname)}`;
  const title = merged.title || titleFallback || siteName;
  const description = merged.description || descriptionFallback || `${siteName} official page`;
  const ogImage = buildAbsoluteUrl(origin, merged.ogImage || imageFallback || DEFAULT_SOCIAL_IMAGE);
  const twitterImage = buildAbsoluteUrl(origin, merged.twitterImage || merged.ogImage || imageFallback || DEFAULT_SOCIAL_IMAGE);

  return {
    ...merged,
    title,
    description,
    canonicalUrl,
    ogTitle: merged.ogTitle || title,
    ogDescription: merged.ogDescription || description,
    ogImage,
    ogImageAlt: merged.ogImageAlt || title,
    ogType: merged.ogType || typeFallback || DEFAULT_OG_TYPE,
    twitterCard: merged.twitterCard || DEFAULT_TWITTER_CARD,
    twitterTitle: merged.twitterTitle || merged.ogTitle || title,
    twitterDescription: merged.twitterDescription || merged.ogDescription || description,
    twitterImage,
    twitterImageAlt: merged.twitterImageAlt || merged.ogImageAlt || title
  };
};

const buildNextMetadata = (resolvedSeo, siteName = 'Astra Attire') => {
  const keywords = trimValue(resolvedSeo.keywords)
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return {
    title: resolvedSeo.title,
    description: resolvedSeo.description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: {
      canonical: resolvedSeo.canonicalUrl
    },
    openGraph: {
      title: resolvedSeo.ogTitle,
      description: resolvedSeo.ogDescription,
      url: resolvedSeo.canonicalUrl,
      siteName,
      type: resolvedSeo.ogType || DEFAULT_OG_TYPE,
      images: resolvedSeo.ogImage
        ? [
          {
            url: resolvedSeo.ogImage,
            alt: resolvedSeo.ogImageAlt || resolvedSeo.ogTitle
          }
        ]
        : undefined
    },
    twitter: {
      card: resolvedSeo.twitterCard || DEFAULT_TWITTER_CARD,
      site: resolvedSeo.twitterSite || undefined,
      creator: resolvedSeo.twitterCreator || undefined,
      title: resolvedSeo.twitterTitle,
      description: resolvedSeo.twitterDescription,
      images: resolvedSeo.twitterImage ? [resolvedSeo.twitterImage] : undefined
    },
    other: {
      robots: resolvedSeo.robots || DEFAULT_ROBOTS,
      googlebot: resolvedSeo.robots || DEFAULT_ROBOTS,
      'twitter:image:alt': resolvedSeo.twitterImageAlt || '',
      'og:image:alt': resolvedSeo.ogImageAlt || ''
    }
  };
};

module.exports = {
  DEFAULT_ROBOTS,
  DEFAULT_TWITTER_CARD,
  DEFAULT_OG_TYPE,
  DEFAULT_SOCIAL_IMAGE,
  PREDEFINED_PUBLIC_PAGES,
  defaultSeoMeta,
  normalizePath,
  normalizeSeoKey,
  sanitizeSeoMeta,
  buildDefaultPublicPages,
  mergePublicPages,
  buildAbsoluteUrl,
  stripHtml,
  resolveSeoForRendering,
  buildNextMetadata
};
