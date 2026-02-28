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
    material,
    fit,
    price,
    countInStock
  } = req.body;

  if (!name || !description || !category || price === undefined) {
    return res.status(400).json({ message: 'Name, description, category and price are required' });
  }

  const product = await Product.create({
    name,
    description,
    image,
    brand,
    category,
    gender,
    sizes: normalizeList(sizes),
    colors: normalizeList(colors),
    material,
    fit,
    price,
    countInStock: countInStock ?? 0
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
