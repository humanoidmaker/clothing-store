const Product = require('../models/Product');

const defaultImage = 'https://placehold.co/600x400?text=Product';

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
      const stock = Number(variant?.stock);
      const images = normalizeImageList(variant?.images);

      if (!size || Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
        return null;
      }

      return {
        size,
        color,
        price,
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

  return {
    sizes,
    colors,
    countInStock,
    minPrice
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

  if (availability === 'in_stock') {
    filters.countInStock = { $gt: 0 };
  }

  if (availability === 'out_of_stock') {
    filters.countInStock = { $lte: 0 };
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
  const [categories, genders, sizes, colors, brands, materials, fits, priceStats] = await Promise.all([
    Product.distinct('category'),
    Product.distinct('gender'),
    Product.distinct('sizes'),
    Product.distinct('colors'),
    Product.distinct('brand'),
    Product.distinct('material'),
    Product.distinct('fit'),
    Product.aggregate([
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
    countInStock
  } = req.body;

  const normalizedVariants = normalizeVariants(variants);
  const variantMeta = getVariantMeta(normalizedVariants);
  const hasVariants = Boolean(variantMeta);

  if (!name || !description || !category || (!hasVariants && price === undefined)) {
    return res.status(400).json({ message: 'Name, description, category and price are required' });
  }

  const normalizedSizes = hasVariants ? variantMeta.sizes : normalizeList(sizes);
  const normalizedColors = hasVariants ? variantMeta.colors : normalizeList(colors);
  const resolvedPrice = hasVariants ? variantMeta.minPrice : Number(price);
  const resolvedStock = hasVariants ? variantMeta.countInStock : Number(countInStock ?? 0);

  if (!hasVariants && (Number.isNaN(resolvedPrice) || resolvedPrice < 0)) {
    return res.status(400).json({ message: 'Price must be a valid positive number' });
  }

  const { primaryImage, finalImages } = resolvePrimaryImage(images, normalizedVariants, image);

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
    variants: normalizedVariants,
    material,
    fit,
    price: resolvedPrice,
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
    product.image = String(req.body.image || '').trim();
  }

  if (hasImagesField) {
    product.images = normalizeImageList(req.body.images);
  }

  if (req.body.sizes !== undefined) {
    product.sizes = normalizeList(req.body.sizes);
  }

  if (req.body.colors !== undefined) {
    product.colors = normalizeList(req.body.colors);
  }

  if (req.body.variants !== undefined) {
    const normalizedVariants = normalizeVariants(req.body.variants);
    product.variants = normalizedVariants;

    const variantMeta = getVariantMeta(normalizedVariants);

    if (variantMeta) {
      product.sizes = variantMeta.sizes;
      product.colors = variantMeta.colors;
      product.price = variantMeta.minPrice;
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
