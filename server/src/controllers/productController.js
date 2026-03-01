const Product = require('../models/Product');
const StoreSettings = require('../models/StoreSettings');
const { isDataImageUrl, saveImageDataUrlToStorage } = require('../utils/mediaStorage');

const defaultImage = 'https://placehold.co/600x400?text=Product';
const SETTINGS_SINGLETON_QUERY = { singletonKey: 'default' };

const parseBooleanQueryFlag = (value) =>
  ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());

const shouldIncludeOutOfStockProducts = async (req) => {
  const isAdminOverride =
    Boolean(req.user?.isAdmin) && parseBooleanQueryFlag(req.query?.includeOutOfStock);

  if (isAdminOverride) {
    return true;
  }

  const settings = await StoreSettings.findOne(SETTINGS_SINGLETON_QUERY).select('showOutOfStockProducts');
  return Boolean(settings?.showOutOfStockProducts);
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

  if (!includeOutOfStockProducts) {
    filters.countInStock = { $gt: 0 };
    if (availability === 'out_of_stock') {
      // Out-of-stock listing is globally hidden, so force no results.
      filters._id = { $exists: false };
    }
  } else {
    if (availability === 'in_stock') {
      filters.countInStock = { $gt: 0 };
    }
    if (availability === 'out_of_stock') {
      filters.countInStock = { $lte: 0 };
    }
  }

  if (minPrice || maxPrice) {
    const minPriceNum = Number(minPrice);
    const maxPriceNum = Number(maxPrice);

    filters.price = {};

    if (minPrice !== undefined && minPrice !== '' && !Number.isNaN(minPriceNum)) {
      filters.price.$gte = minPriceNum;
    }

    if (maxPrice !== undefined && maxPrice !== '' && !Number.isNaN(maxPriceNum)) {
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

  const totalItems = await Product.countDocuments(filters);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * limit;

  const products = await Product.find(filters)
    .sort(sortBy[sort] || sortBy.newest)
    .skip(skip)
    .limit(limit);

  return res.json({
    products,
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
  const visibilityFilters = includeOutOfStockProducts ? {} : { countInStock: { $gt: 0 } };

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
  if (!includeOutOfStockProducts && Number(product.countInStock || 0) <= 0) {
    return res.status(404).json({ message: 'Product not found' });
  }

  return res.json(product);
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
  createProduct,
  updateProduct,
  deleteProduct
};
