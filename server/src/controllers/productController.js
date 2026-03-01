const Product = require('../models/Product');
const Order = require('../models/Order');
const StoreSettings = require('../models/StoreSettings');
const { isDataImageUrl, saveImageDataUrlToStorage } = require('../utils/mediaStorage');
const {
  resolveResellerContext,
  shouldApplyResellerPricing,
  applyResellerPricingToProduct
} = require('../utils/resellerPricing');

const defaultImage = 'https://placehold.co/600x400?text=Product';
const SETTINGS_SINGLETON_QUERY = { singletonKey: 'default' };
const REVIEW_ELIGIBLE_ORDER_STATUSES = ['paid', 'shipped', 'delivered'];

const parseBooleanQueryFlag = (value) =>
  ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const buildEffectiveStockExpression = () => ({
  $cond: [
    { $gt: [{ $size: { $ifNull: ['$variants', []] } }, 0] },
    {
      $sum: {
        $map: {
          input: { $ifNull: ['$variants', []] },
          as: 'variant',
          in: { $ifNull: ['$$variant.stock', 0] }
        }
      }
    },
    { $ifNull: ['$countInStock', 0] }
  ]
});

const getEffectiveProductStock = (product = {}) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) {
    return variants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0);
  }

  return Number(product.countInStock || 0);
};

const sanitizeProductForStorefront = (product, includeOutOfStockProducts) => {
  if (!product || includeOutOfStockProducts) {
    return product;
  }

  const source = typeof product.toObject === 'function' ? product.toObject() : { ...product };
  const variants = Array.isArray(source.variants) ? source.variants : [];

  if (variants.length === 0) {
    return source;
  }

  const visibleVariants = variants.filter((variant) => Number(variant?.stock || 0) > 0);
  if (visibleVariants.length === variants.length) {
    return source;
  }

  source.variants = visibleVariants;
  source.sizes = [...new Set(visibleVariants.map((variant) => String(variant?.size || '').trim()).filter(Boolean))];
  source.colors = [
    ...new Set(visibleVariants.map((variant) => String(variant?.color || '').trim()).filter(Boolean))
  ];

  if (visibleVariants.length > 0) {
    source.price = visibleVariants.reduce(
      (min, variant) => (Number(variant?.price || 0) < min ? Number(variant?.price || 0) : min),
      Number(visibleVariants[0]?.price || 0)
    );
    source.purchasePrice = visibleVariants.reduce(
      (min, variant) => (Number(variant?.purchasePrice || 0) < min ? Number(variant?.purchasePrice || 0) : min),
      Number(visibleVariants[0]?.purchasePrice || 0)
    );
    source.countInStock = visibleVariants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0);
  }

  return source;
};

const shouldIncludeOutOfStockProducts = async (req) => {
  const isAdminOverride =
    Boolean(req.user?.isAdmin) && parseBooleanQueryFlag(req.query?.includeOutOfStock);

  if (isAdminOverride) {
    return true;
  }

  const settings = await StoreSettings.findOne(SETTINGS_SINGLETON_QUERY).select('showOutOfStockProducts');
  return Boolean(settings?.showOutOfStockProducts);
};

const normalizeReviewComment = (value) => {
  const comment = String(value || '').trim();
  if (!comment) {
    throw new Error('Review comment is required');
  }
  if (comment.length > 1200) {
    throw new Error('Review comment must be 1200 characters or less');
  }
  return comment;
};

const normalizeReviewRating = (value) => {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be a number between 1 and 5');
  }
  return Math.round(rating);
};

const getProductSnapshotWithoutHiddenReviews = (product, resellerId = '') => {
  const source = typeof product?.toObject === 'function' ? product.toObject() : { ...(product || {}) };
  const allReviews = Array.isArray(source.reviews) ? source.reviews : [];
  const normalizedResellerId = String(resellerId || '').trim();
  source.reviews = allReviews
    .filter((review) => {
      if (review?.isHidden) {
        return false;
      }
      const reviewResellerId = String(review?.resellerId || '').trim();
      if (normalizedResellerId) {
        return reviewResellerId === normalizedResellerId;
      }
      return !reviewResellerId;
    })
    .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime())
    .map((review) => ({
      _id: review._id,
      name: String(review?.name || '').trim() || 'Verified Customer',
      rating: Number(review?.rating || 0),
      comment: String(review?.comment || '').trim(),
      createdAt: review?.createdAt || null,
      updatedAt: review?.updatedAt || null
    }));
  const visibleReviews = source.reviews;
  const visibleRatingsTotal = visibleReviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
  source.numReviews = visibleReviews.length;
  source.rating = visibleReviews.length > 0 ? Number((visibleRatingsTotal / visibleReviews.length).toFixed(1)) : 0;
  return source;
};

const recalculateProductRating = (product) => {
  const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const visibleReviews = reviews.filter((review) => !review?.isHidden);
  const total = visibleReviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0);
  const count = visibleReviews.length;

  product.numReviews = count;
  product.rating = count > 0 ? Number((total / count).toFixed(1)) : 0;
};

const buildReviewOrderScope = (resellerId = '') => {
  const normalizedResellerId = String(resellerId || '').trim();
  if (normalizedResellerId) {
    return { resellerId: normalizedResellerId };
  }

  return {
    $or: [
      { resellerId: { $exists: false } },
      { resellerId: '' },
      { resellerId: null }
    ]
  };
};

const buildReviewPolicy = async (product, user, resellerId = '') => {
  const policy = {
    isAuthenticated: Boolean(user?._id),
    hasPurchased: false,
    alreadyReviewed: false,
    canSubmit: false,
    reason: 'login_required'
  };

  if (!user?._id) {
    return policy;
  }

  if (user.isAdmin) {
    return {
      ...policy,
      reason: 'admin_account'
    };
  }

  const userId = String(user._id);
  const reviews = Array.isArray(product?.reviews) ? product.reviews : [];
  const normalizedResellerId = String(resellerId || '').trim();
  const alreadyReviewed = reviews.some(
    (review) =>
      String(review?.user || '') === userId &&
      String(review?.resellerId || '').trim() === normalizedResellerId
  );
  if (alreadyReviewed) {
    return {
      ...policy,
      alreadyReviewed: true,
      reason: 'already_reviewed'
    };
  }

  const purchased = await Order.exists({
    user: user._id,
    status: { $in: REVIEW_ELIGIBLE_ORDER_STATUSES },
    ...buildReviewOrderScope(resellerId),
    orderItems: {
      $elemMatch: {
        product: product._id
      }
    }
  });

  if (!purchased) {
    return {
      ...policy,
      reason: 'purchase_required'
    };
  }

  return {
    ...policy,
    hasPurchased: true,
    canSubmit: true,
    reason: 'eligible'
  };
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeImageList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fall through to single string interpretation
      }
    }

    return [trimmed];
  }

  return [];
};

const normalizeVariants = (value) => {
  let parsed = value;

  if (!value) return [];

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((variant) => {
      const size = String(variant?.size || '').trim();
      const color = String(variant?.color || '').trim();
      const price = Number(variant?.price);
      const purchasePrice = Number(variant?.purchasePrice);
      const stock = Number(variant?.stock);
      const images = normalizeImageList(variant?.images);

      if (
        !size ||
        Number.isNaN(price) ||
        price < 0 ||
        Number.isNaN(purchasePrice) ||
        purchasePrice < 0 ||
        Number.isNaN(stock) ||
        stock < 0
      ) {
        return null;
      }

      return {
        size,
        color,
        price,
        purchasePrice,
        stock,
        images
      };
    })
    .filter(Boolean);
};

const getVariantMeta = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return null;
  }

  const sizes = [...new Set(variants.map((variant) => variant.size))];
  const colors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))];
  const countInStock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const minPrice = variants.reduce((min, variant) => (variant.price < min ? variant.price : min), variants[0].price);
  const minPurchasePrice = variants.reduce(
    (min, variant) => (variant.purchasePrice < min ? variant.purchasePrice : min),
    variants[0].purchasePrice
  );

  return {
    sizes,
    colors,
    countInStock,
    minPrice,
    minPurchasePrice
  };
};

const resolvePrimaryImage = (images, variants, fallbackImage) => {
  const normalizedImages = normalizeImageList(images);
  const normalizedFallback = String(fallbackImage || '').trim();
  const firstVariantImage =
    (Array.isArray(variants) ? variants : []).find((variant) => Array.isArray(variant.images) && variant.images.length > 0)
      ?.images?.[0] || '';

  const primaryImage = normalizedImages[0] || normalizedFallback || firstVariantImage || defaultImage;
  const finalImages =
    normalizedImages.length > 0
      ? normalizedImages
      : primaryImage
        ? [primaryImage]
        : [defaultImage];

  return { primaryImage, finalImages };
};

const sortValues = (values) =>
  values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

const buildSortComparator = (sort) => {
  if (sort === 'price_asc') {
    return (left, right) => Number(left?.price || 0) - Number(right?.price || 0);
  }

  if (sort === 'price_desc') {
    return (left, right) => Number(right?.price || 0) - Number(left?.price || 0);
  }

  if (sort === 'rating') {
    return (left, right) => {
      const ratingDiff = Number(right?.rating || 0) - Number(left?.rating || 0);
      if (ratingDiff !== 0) {
        return ratingDiff;
      }
      const reviewsDiff = Number(right?.numReviews || 0) - Number(left?.numReviews || 0);
      if (reviewsDiff !== 0) {
        return reviewsDiff;
      }
      return new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
    };
  }

  return (left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime();
};

const persistImageIfNeeded = async (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  if (isDataImageUrl(normalized)) {
    const stored = await saveImageDataUrlToStorage(normalized);
    return stored.url;
  }

  return normalized;
};

const persistImageListIfNeeded = async (values) => {
  const normalized = normalizeImageList(values);
  const resolved = [];

  for (const image of normalized) {
    const persisted = await persistImageIfNeeded(image);
    if (persisted) {
      resolved.push(persisted);
    }
  }

  return resolved;
};

const persistVariantImagesIfNeeded = async (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) {
    return [];
  }

  const resolvedVariants = [];
  for (const variant of variants) {
    resolvedVariants.push({
      ...variant,
      images: await persistImageListIfNeeded(variant.images)
    });
  }

  return resolvedVariants;
};

const getProducts = async (req, res) => {
  const {
    search,
    category,
    gender,
    size,
    color,
    brand,
    material,
    fit,
    availability,
    minPrice,
    maxPrice,
    sort = 'newest',
    page: pageQuery = '1',
    limit: limitQuery = '12'
  } = req.query;

  const filters = {};

  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filters.$or = [
      { name: searchRegex },
      { brand: searchRegex },
      { category: searchRegex },
      { material: searchRegex },
      { fit: searchRegex }
    ];
  }

  if (category && category !== 'All') {
    filters.category = category;
  }

  if (gender && gender !== 'All') {
    filters.gender = gender;
  }

  if (size) {
    filters.sizes = { $in: [size] };
  }

  if (color) {
    filters.colors = { $in: [color] };
  }

  if (brand && brand !== 'All') {
    filters.brand = brand;
  }

  if (material && material !== 'All') {
    filters.material = material;
  }

  if (fit && fit !== 'All') {
    filters.fit = fit;
  }

  const includeOutOfStockProducts = await shouldIncludeOutOfStockProducts(req);
  const resellerContext = await resolveResellerContext(req);
  const applyResellerPriceAdjustments = shouldApplyResellerPricing(req, resellerContext?.reseller);

  const effectiveStockExpr = buildEffectiveStockExpression();

  if (!includeOutOfStockProducts) {
    filters.$expr = { $gt: [effectiveStockExpr, 0] };
    if (availability === 'out_of_stock') {
      // Out-of-stock listing is globally hidden, so force no results.
      filters._id = { $exists: false };
    }
  } else {
    if (availability === 'in_stock') {
      filters.$expr = { $gt: [effectiveStockExpr, 0] };
    }
    if (availability === 'out_of_stock') {
      filters.$expr = { $lte: [effectiveStockExpr, 0] };
    }
  }

  const minPriceNum = Number(minPrice);
  const maxPriceNum = Number(maxPrice);
  const hasMinPrice = minPrice !== undefined && minPrice !== '' && !Number.isNaN(minPriceNum);
  const hasMaxPrice = maxPrice !== undefined && maxPrice !== '' && !Number.isNaN(maxPriceNum);

  if ((hasMinPrice || hasMaxPrice) && !applyResellerPriceAdjustments) {
    filters.price = {};

    if (hasMinPrice) {
      filters.price.$gte = minPriceNum;
    }

    if (hasMaxPrice) {
      filters.price.$lte = maxPriceNum;
    }

    if (Object.keys(filters.price).length === 0) {
      delete filters.price;
    }
  }

  const sortBy = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1, numReviews: -1 }
  };

  const parsedPage = Number.parseInt(pageQuery, 10);
  const parsedLimit = Number.parseInt(limitQuery, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 12;

  if (applyResellerPriceAdjustments) {
    const products = await Product.find(filters).sort({ createdAt: -1 });
    let visibleProducts = products.map((product) => {
      const visibleProduct = sanitizeProductForStorefront(product, includeOutOfStockProducts);
      const pricedProduct = applyResellerPricingToProduct(visibleProduct, resellerContext.reseller);
      const source = typeof pricedProduct?.toObject === 'function' ? pricedProduct.toObject() : { ...pricedProduct };
      delete source.reviews;
      return source;
    });

    if (hasMinPrice || hasMaxPrice) {
      visibleProducts = visibleProducts.filter((product) => {
        const productPrice = Number(product?.price || 0);
        if (hasMinPrice && productPrice < minPriceNum) {
          return false;
        }
        if (hasMaxPrice && productPrice > maxPriceNum) {
          return false;
        }
        return true;
      });
    }

    visibleProducts.sort(buildSortComparator(sort));

    const totalItems = visibleProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const currentPage = Math.min(page, totalPages);
    const skip = (currentPage - 1) * limit;
    const paginatedProducts = visibleProducts.slice(skip, skip + limit);

    return res.json({
      products: paginatedProducts,
      page: currentPage,
      limit,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    });
  }

  const totalItems = await Product.countDocuments(filters);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * limit;

  const products = await Product.find(filters)
    .sort(sortBy[sort] || sortBy.newest)
    .skip(skip)
    .limit(limit);
  const visibleProducts = products.map((product) => {
    const visibleProduct = sanitizeProductForStorefront(product, includeOutOfStockProducts);
    const source = typeof visibleProduct?.toObject === 'function' ? visibleProduct.toObject() : { ...visibleProduct };
    delete source.reviews;
    return source;
  });

  return res.json({
    products: visibleProducts,
    page: currentPage,
    limit,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  });
};

const getProductFilterOptions = async (req, res) => {
  const includeOutOfStockProducts = await shouldIncludeOutOfStockProducts(req);
  const visibilityFilters = includeOutOfStockProducts ? {} : { $expr: { $gt: [buildEffectiveStockExpression(), 0] } };
  const resellerContext = await resolveResellerContext(req);
  const applyResellerPriceAdjustments = shouldApplyResellerPricing(req, resellerContext?.reseller);

  if (applyResellerPriceAdjustments) {
    const products = await Product.find(visibilityFilters).sort({ createdAt: -1 });
    const categories = new Set();
    const genders = new Set();
    const sizes = new Set();
    const colors = new Set();
    const brands = new Set();
    const materials = new Set();
    const fits = new Set();

    let minPrice = Number.POSITIVE_INFINITY;
    let maxPrice = 0;

    for (const product of products) {
      const visibleProduct = sanitizeProductForStorefront(product, includeOutOfStockProducts);
      const pricedProduct = applyResellerPricingToProduct(visibleProduct, resellerContext.reseller);

      categories.add(String(pricedProduct?.category || '').trim());
      genders.add(String(pricedProduct?.gender || '').trim());
      brands.add(String(pricedProduct?.brand || '').trim());
      materials.add(String(pricedProduct?.material || '').trim());
      fits.add(String(pricedProduct?.fit || '').trim());

      const productSizes = Array.isArray(pricedProduct?.sizes) ? pricedProduct.sizes : [];
      const productColors = Array.isArray(pricedProduct?.colors) ? pricedProduct.colors : [];
      for (const size of productSizes) {
        sizes.add(String(size || '').trim());
      }
      for (const color of productColors) {
        colors.add(String(color || '').trim());
      }

      const priceValue = Number(pricedProduct?.price || 0);
      if (Number.isFinite(priceValue) && priceValue >= 0) {
        minPrice = Math.min(minPrice, priceValue);
        maxPrice = Math.max(maxPrice, priceValue);
      }
    }

    return res.json({
      categories: sortValues(Array.from(categories)),
      genders: sortValues(Array.from(genders)),
      sizes: sortValues(Array.from(sizes)),
      colors: sortValues(Array.from(colors)),
      brands: sortValues(Array.from(brands)),
      materials: sortValues(Array.from(materials)),
      fits: sortValues(Array.from(fits)),
      minPrice: Number.isFinite(minPrice) ? minPrice : 0,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : 0
    });
  }

  const [categories, genders, sizes, colors, brands, materials, fits, priceStats] = await Promise.all([
    Product.distinct('category', visibilityFilters),
    Product.distinct('gender', visibilityFilters),
    Product.distinct('sizes', visibilityFilters),
    Product.distinct('colors', visibilityFilters),
    Product.distinct('brand', visibilityFilters),
    Product.distinct('material', visibilityFilters),
    Product.distinct('fit', visibilityFilters),
    Product.aggregate([
      ...(includeOutOfStockProducts ? [] : [{ $match: visibilityFilters }]),
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ])
  ]);

  const minPrice = Number(priceStats?.[0]?.minPrice ?? 0);
  const maxPrice = Number(priceStats?.[0]?.maxPrice ?? 0);

  return res.json({
    categories: sortValues(categories),
    genders: sortValues(genders),
    sizes: sortValues(sizes),
    colors: sortValues(colors),
    brands: sortValues(brands),
    materials: sortValues(materials),
    fits: sortValues(fits),
    minPrice: Number.isFinite(minPrice) ? minPrice : 0,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : 0
  });
};

const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const includeOutOfStockProducts = await shouldIncludeOutOfStockProducts(req);
  if (!includeOutOfStockProducts && getEffectiveProductStock(product) <= 0) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const resellerContext = await resolveResellerContext(req);
  const applyResellerPriceAdjustments = shouldApplyResellerPricing(req, resellerContext?.reseller);
  const visibleProduct = sanitizeProductForStorefront(product, includeOutOfStockProducts);
  const pricedProduct = applyResellerPriceAdjustments
    ? applyResellerPricingToProduct(visibleProduct, resellerContext.reseller)
    : visibleProduct;
  const reviewResellerId = applyResellerPriceAdjustments ? String(resellerContext?.reseller?.id || '').trim() : '';
  const productWithPublicReviews = getProductSnapshotWithoutHiddenReviews(pricedProduct, reviewResellerId);
  productWithPublicReviews.reviewPolicy = await buildReviewPolicy(product, req.user || null, reviewResellerId);
  return res.json(productWithPublicReviews);
};

const createProductReview = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const resellerContext = await resolveResellerContext(req);
  const applyResellerPriceAdjustments = shouldApplyResellerPricing(req, resellerContext?.reseller);
  const reviewResellerId = applyResellerPriceAdjustments ? String(resellerContext?.reseller?.id || '').trim() : '';
  const reviewResellerName = applyResellerPriceAdjustments
    ? String(resellerContext?.reseller?.websiteName || resellerContext?.reseller?.name || '').trim()
    : '';

  const reviewPolicy = await buildReviewPolicy(product, req.user, reviewResellerId);
  if (!reviewPolicy.canSubmit) {
    if (reviewPolicy.reason === 'already_reviewed') {
      return res.status(409).json({ message: 'You have already reviewed this product' });
    }
    return res.status(403).json({ message: 'Only verified customers can review this product' });
  }

  let rating;
  let comment;
  try {
    rating = normalizeReviewRating(req.body?.rating);
    comment = normalizeReviewComment(req.body?.comment);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid review payload' });
  }

  product.reviews.push({
    user: req.user._id,
    name: String(req.user?.name || '').trim() || 'Verified Customer',
    rating,
    comment,
    resellerId: reviewResellerId,
    resellerName: reviewResellerName
  });

  recalculateProductRating(product);
  await product.save();

  const createdReview = product.reviews[product.reviews.length - 1];
  return res.status(201).json({
    message: 'Review submitted successfully',
    review: {
      _id: createdReview._id,
      name: createdReview.name,
      rating: Number(createdReview.rating || 0),
      comment: createdReview.comment,
      createdAt: createdReview.createdAt,
      updatedAt: createdReview.updatedAt
    },
    rating: {
      rating: Number(product.rating || 0),
      numReviews: Number(product.numReviews || 0)
    }
  });
};

const getAdminProductReviews = async (req, res) => {
  const resellerScopeId =
    !req.user?.isAdmin && req.user?.isResellerAdmin
      ? String(req.user?.resellerId || '').trim()
      : '';
  const products = await Product.find({ 'reviews.0': { $exists: true } }).select('name image reviews');
  const flattened = [];

  for (const product of products) {
    const productName = String(product?.name || '').trim() || 'Product';
    const productImage = String(product?.image || '').trim();
    const reviews = Array.isArray(product?.reviews) ? product.reviews : [];

    for (const review of reviews) {
      const reviewResellerId = String(review?.resellerId || '').trim();
      if (resellerScopeId && reviewResellerId !== resellerScopeId) {
        continue;
      }

      flattened.push({
        productId: String(product._id),
        productName,
        productImage,
        reviewId: String(review._id),
        userId: String(review?.user || ''),
        resellerId: reviewResellerId,
        resellerName: String(review?.resellerName || '').trim(),
        name: String(review?.name || '').trim() || 'Verified Customer',
        rating: Number(review?.rating || 0),
        comment: String(review?.comment || '').trim(),
        isHidden: Boolean(review?.isHidden),
        hiddenAt: review?.hiddenAt || null,
        createdAt: review?.createdAt || null,
        updatedAt: review?.updatedAt || null
      });
    }
  }

  flattened.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
  return res.json({ reviews: flattened, total: flattened.length });
};

const setProductReviewVisibility = async (req, res) => {
  if (typeof req.body?.hidden !== 'boolean') {
    return res.status(400).json({ message: 'hidden must be a boolean value' });
  }

  const product = await Product.findById(req.params.productId);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const review = product.reviews.id(req.params.reviewId);
  if (!review) {
    return res.status(404).json({ message: 'Review not found' });
  }

  if (!req.user?.isAdmin && req.user?.isResellerAdmin) {
    const requesterResellerId = String(req.user?.resellerId || '').trim();
    const reviewResellerId = String(review?.resellerId || '').trim();
    if (!requesterResellerId || reviewResellerId !== requesterResellerId) {
      return res.status(404).json({ message: 'Review not found' });
    }
  }

  const shouldHide = Boolean(req.body.hidden);
  review.isHidden = shouldHide;
  review.hiddenAt = shouldHide ? new Date() : null;
  review.hiddenBy = shouldHide ? req.user._id : null;

  recalculateProductRating(product);
  await product.save();

  return res.json({
    message: shouldHide ? 'Review hidden successfully' : 'Review is visible now',
    review: {
      productId: String(product._id),
      reviewId: String(review._id),
      isHidden: Boolean(review.isHidden),
      hiddenAt: review.hiddenAt || null
    },
    rating: {
      rating: Number(product.rating || 0),
      numReviews: Number(product.numReviews || 0)
    }
  });
};

const createProduct = async (req, res) => {
  const {
    name,
    description,
    image,
    images,
    brand,
    category,
    gender,
    sizes,
    colors,
    variants,
    material,
    fit,
    price,
    purchasePrice,
    countInStock
  } = req.body;

  const normalizedVariants = normalizeVariants(variants);
  const persistedVariants = await persistVariantImagesIfNeeded(normalizedVariants);
  const variantMeta = getVariantMeta(persistedVariants);
  const hasVariants = Boolean(variantMeta);

  if (!name || !description || !category || (!hasVariants && (price === undefined || purchasePrice === undefined))) {
    return res.status(400).json({ message: 'Name, description, category, price and purchase price are required' });
  }

  const normalizedSizes = hasVariants ? variantMeta.sizes : normalizeList(sizes);
  const normalizedColors = hasVariants ? variantMeta.colors : normalizeList(colors);
  const resolvedPrice = hasVariants ? variantMeta.minPrice : Number(price);
  const resolvedPurchasePrice = hasVariants ? variantMeta.minPurchasePrice : Number(purchasePrice);
  const resolvedStock = hasVariants ? variantMeta.countInStock : Number(countInStock ?? 0);

  if (!hasVariants && (Number.isNaN(resolvedPrice) || resolvedPrice < 0)) {
    return res.status(400).json({ message: 'Price must be a valid positive number' });
  }
  if (!hasVariants && (Number.isNaN(resolvedPurchasePrice) || resolvedPurchasePrice < 0)) {
    return res.status(400).json({ message: 'Purchase price must be a valid positive number' });
  }

  const persistedImage = await persistImageIfNeeded(image);
  const persistedImages = await persistImageListIfNeeded(images);
  const { primaryImage, finalImages } = resolvePrimaryImage(persistedImages, persistedVariants, persistedImage);

  const product = await Product.create({
    name,
    description,
    image: primaryImage,
    images: finalImages,
    brand,
    category,
    gender,
    sizes: normalizedSizes,
    colors: normalizedColors,
    variants: persistedVariants,
    material,
    fit,
    price: resolvedPrice,
    purchasePrice: resolvedPurchasePrice,
    countInStock: resolvedStock
  });

  return res.status(201).json(product);
};

const updateProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const fields = [
    'name',
    'description',
    'brand',
    'category',
    'gender',
    'material',
    'fit',
    'price',
    'purchasePrice',
    'countInStock'
  ];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  const hasImageField = Object.prototype.hasOwnProperty.call(req.body, 'image');
  const hasImagesField = Object.prototype.hasOwnProperty.call(req.body, 'images');

  if (hasImageField) {
    product.image = await persistImageIfNeeded(req.body.image);
  }

  if (hasImagesField) {
    product.images = await persistImageListIfNeeded(req.body.images);
  }

  if (req.body.sizes !== undefined) {
    product.sizes = normalizeList(req.body.sizes);
  }

  if (req.body.colors !== undefined) {
    product.colors = normalizeList(req.body.colors);
  }

  if (req.body.variants !== undefined) {
    const normalizedVariants = normalizeVariants(req.body.variants);
    const persistedVariants = await persistVariantImagesIfNeeded(normalizedVariants);
    product.variants = persistedVariants;

    const variantMeta = getVariantMeta(persistedVariants);

    if (variantMeta) {
      product.sizes = variantMeta.sizes;
      product.colors = variantMeta.colors;
      product.price = variantMeta.minPrice;
      product.purchasePrice = variantMeta.minPurchasePrice;
      product.countInStock = variantMeta.countInStock;
    }
  }

  const imageFallback = hasImageField ? product.image : hasImagesField ? '' : product.image;
  const { primaryImage, finalImages } = resolvePrimaryImage(product.images, product.variants, imageFallback);
  product.image = primaryImage;
  product.images = finalImages;

  const updatedProduct = await product.save();
  return res.json(updatedProduct);
};

const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await product.deleteOne();
  return res.json({ message: 'Product deleted' });
};

module.exports = {
  getProducts,
  getProductFilterOptions,
  getProductById,
  createProductReview,
  getAdminProductReviews,
  setProductReviewVisibility,
  createProduct,
  updateProduct,
  deleteProduct
};
