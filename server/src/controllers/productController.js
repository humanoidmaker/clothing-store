const Product = require('../models/Product');

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

      if (!size || Number.isNaN(price) || price < 0 || Number.isNaN(stock) || stock < 0) {
        return null;
      }

      return {
        size,
        color,
        price,
        stock
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

const getProducts = async (req, res) => {
  const { search, category, gender, size, color, minPrice, maxPrice, sort = 'newest' } = req.query;

  const filters = {};

  if (search) {
    filters.name = { $regex: search, $options: 'i' };
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

  const products = await Product.find(filters).sort(sortBy[sort] || sortBy.newest);
  return res.json(products);
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

  const product = await Product.create({
    name,
    description,
    image,
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
    'image',
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
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
