const Product = require('../models/Product');

const getProducts = async (req, res) => {
  const { search, category } = req.query;

  const filters = {};

  if (search) {
    filters.name = { $regex: search, $options: 'i' };
  }

  if (category) {
    filters.category = category;
  }

  const products = await Product.find(filters).sort({ createdAt: -1 });
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
  const { name, description, image, brand, category, price, countInStock } = req.body;

  if (!name || !description || !category || price === undefined) {
    return res.status(400).json({ message: 'Name, description, category and price are required' });
  }

  const product = await Product.create({
    name,
    description,
    image,
    brand,
    category,
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

  const fields = ['name', 'description', 'image', 'brand', 'category', 'price', 'countInStock'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

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
