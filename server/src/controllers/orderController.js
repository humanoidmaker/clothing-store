const Order = require('../models/Order');
const Product = require('../models/Product');

const createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Order items are required' });
  }

  if (!shippingAddress) {
    return res.status(400).json({ message: 'Shipping address is required' });
  }

  const orderItems = [];
  let totalPrice = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      return res.status(404).json({ message: `Product not found: ${item.productId}` });
    }

    const quantity = Number(item.quantity || 0);

    if (quantity < 1) {
      return res.status(400).json({ message: `Invalid quantity for ${product.name}` });
    }

    if (product.countInStock < quantity) {
      return res.status(400).json({ message: `${product.name} is out of stock` });
    }

    product.countInStock -= quantity;
    await product.save();

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity
    });

    totalPrice += product.price * quantity;
  }

  const order = await Order.create({
    user: req.user._id,
    orderItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'Cash on Delivery',
    totalPrice
  });

  return res.status(201).json(order);
};

const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  return res.json(orders);
};

const getAllOrders = async (req, res) => {
  const orders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  return res.json(orders);
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders
};
