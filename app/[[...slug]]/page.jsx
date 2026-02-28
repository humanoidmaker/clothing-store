import dynamicImport from 'next/dynamic';
import { headers } from 'next/headers';
import mongoose from 'mongoose';
import connectDB from '../../server/src/config/db';
import Product from '../../server/src/models/Product';
import StoreSettings from '../../server/src/models/StoreSettings';
import SeoSettings from '../../server/src/models/SeoSettings';
import seoUtils from '../../server/src/utils/seo';

const {
  DEFAULT_SOCIAL_IMAGE,
  normalizePath,
  mergePublicPages,
  sanitizeSeoMeta,
  stripHtml,
  resolveSeoForRendering,
  buildNextMetadata
} = seoUtils;

const LegacyApp = dynamicImport(() => import('../../client/src/App'), {
  ssr: false
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getRequestOrigin = () => {
  const headerStore = headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host') || `localhost:${process.env.PORT || 3000}`;
  const protocol = headerStore.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
};

const toPathname = (slugSegments = []) => {
  if (!Array.isArray(slugSegments) || slugSegments.length === 0) {
    return '/';
  }
  return normalizePath(`/${slugSegments.join('/')}`);
};

const getPublicPageEntry = (publicPages, pathname) => {
  const normalized = normalizePath(pathname);
  return publicPages.find((entry) => normalizePath(entry.path) === normalized) || null;
};

const buildProductFallbackKeywords = (product, storeName) =>
  [product.name, product.category, product.brand, storeName]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ');

export async function generateMetadata({ params }) {
  const slugSegments = Array.isArray(params?.slug) ? params.slug : [];
  const pathname = toPathname(slugSegments);
  const origin = getRequestOrigin();

  await connectDB();

  const [storeSettings, seoSettings] = await Promise.all([
    StoreSettings.findOne({ singletonKey: 'default' }).select('storeName').lean(),
    SeoSettings.findOne({ singletonKey: 'default' }).select('defaults publicPages').lean()
  ]);

  const storeName = String(storeSettings?.storeName || 'Astra Attire').trim() || 'Astra Attire';
  const defaults = sanitizeSeoMeta(seoSettings?.defaults || {});
  const publicPages = mergePublicPages(seoSettings?.publicPages || [], storeName);
  const isProductDetailPage = slugSegments.length >= 2 && slugSegments[0] === 'products';

  if (isProductDetailPage && mongoose.Types.ObjectId.isValid(slugSegments[1])) {
    const product = await Product.findById(slugSegments[1])
      .select('name description image images category brand seo')
      .lean();

    if (product) {
      const imageFallback =
        product.image ||
        (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '') ||
        DEFAULT_SOCIAL_IMAGE;

      const resolved = resolveSeoForRendering({
        meta: product.seo || {},
        fallbackMeta: defaults,
        titleFallback: `${product.name} | ${storeName}`,
        descriptionFallback: stripHtml(product.description).slice(0, 280),
        imageFallback,
        pathname,
        origin,
        siteName: storeName,
        typeFallback: 'product'
      });

      if (!resolved.keywords) {
        resolved.keywords = buildProductFallbackKeywords(product, storeName);
      }

      return buildNextMetadata(resolved, storeName);
    }
  }

  const publicPage = getPublicPageEntry(publicPages, pathname);

  const resolved = resolveSeoForRendering({
    meta: publicPage?.meta || {},
    fallbackMeta: defaults,
    titleFallback: publicPage ? `${publicPage.label} | ${storeName}` : `${storeName} | Fashion Store`,
    descriptionFallback: publicPage
      ? `Browse ${publicPage.label.toLowerCase()} on ${storeName}.`
      : `Explore ${storeName} premium fashion collection.`,
    imageFallback: DEFAULT_SOCIAL_IMAGE,
    pathname,
    origin,
    siteName: storeName,
    typeFallback: 'website'
  });

  if (!resolved.keywords) {
    resolved.keywords = `${storeName}, fashion, ecommerce`;
  }

  return buildNextMetadata(resolved, storeName);
}

const CatchAllPage = () => {
  return <LegacyApp />;
};

export default CatchAllPage;
