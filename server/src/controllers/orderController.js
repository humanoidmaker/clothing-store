const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');

const validateShippingAddress = (shippingAddress) => {
  const requiredKeys = ['street', 'city', 'state', 'postalCode', 'country'];

  if (!shippingAddress) return false;

  return requiredKeys.every((key) => String(shippingAddress[key] || '').trim().length > 0);
};

const prepareOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: { status: 400, message: 'Order items are required' } };
  }

  const orderItems = [];
  const stockUpdates = [];
  let totalPrice = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      return { error: { status: 404, message: `Product not found: ${item.productId}` } };
    }

    const quantity = Number(item.quantity || 0);

    if (quantity < 1) {
      return { error: { status: 400, message: `Invalid quantity for ${product.name}` } };
    }

    if (product.countInStock < quantity) {
      return { error: { status: 400, message: `${product.name} is out of stock` } };
    }

    const selectedSize = String(item.selectedSize || '').trim();
    const selectedColor = String(item.selectedColor || '').trim();

    if (selectedSize && Array.isArray(product.sizes) && product.sizes.length > 0 && !product.sizes.includes(selectedSize)) {
      return { error: { status: 400, message: `Invalid size selected for ${product.name}` } };
    }

    if (
      selectedColor &&
      Array.isArray(product.colors) &&
      product.colors.length > 0 &&
      !product.colors.includes(selectedColor)
    ) {
      return { error: { status: 400, message: `Invalid color selected for ${product.name}` } };
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity,
      selectedSize,
      selectedColor
    });

    stockUpdates.push({ product, quantity });
    totalPrice += product.price * quantity;
  }

  return { orderItems, stockUpdates, totalPrice };
};

const deductStock = async (stockUpdates) => {
  for (const update of stockUpdates) {
    update.product.countInStock -= update.quantity;
    await update.product.save();
  }
};

const createStoredOrder = async ({
  userId,
  items,
  shippingAddress,
  paymentMethod,
  status = 'pending',
  paidAt,
  paymentResult
}) => {
  const prepared = await prepareOrderItems(items);
  if (prepared.error) {
    return { error: prepared.error };
  }

  await deductStock(prepared.stockUpdates);

  const order = await Order.create({
    user: userId,
    orderItems: prepared.orderItems,
    shippingAddress,
    paymentMethod,
    totalPrice: prepared.totalPrice,
    status,
    paidAt,
    paymentResult
  });

  return { order };
};

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return { error: { status: 500, message: 'Razorpay keys are not configured on server' } };
  }

  return {
    keyId,
    keySecret,
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })
  };
};

const createOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  if (!validateShippingAddress(shippingAddress)) {
    return res.status(400).json({ message: 'Complete shipping address is required' });
  }

  const saved = await createStoredOrder({
    userId: req.user._id,
    items,
    shippingAddress,
    paymentMethod: paymentMethod || 'Cash on Delivery'
  });

  if (saved.error) {
    return res.status(saved.error.status).json({ message: saved.error.message });
  }

  return res.status(201).json(saved.order);
};

const createRazorpayOrder = async (req, res) => {
  const { items } = req.body;
  const razorpay = getRazorpayClient();

  if (razorpay.error) {
    return res.status(razorpay.error.status).json({ message: razorpay.error.message });
  }

  const prepared = await prepareOrderItems(items);
  if (prepared.error) {
    return res.status(prepared.error.status).json({ message: prepared.error.message });
  }

  const amountPaise = Math.round(prepared.totalPrice * 100);

  if (amountPaise < 100) {
    return res.status(400).json({ message: 'Order amount must be at least INR 1.00' });
  }

  const receipt = `rcpt_${Date.now()}_${String(req.user._id).slice(-6)}`.slice(0, 40);
  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.client.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt
    });
  } catch {
    return res.status(502).json({ message: 'Failed to create Razorpay order' });
  }

  return res.json({
    keyId: razorpay.keyId,
    orderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency
  });
};

const verifyRazorpayPaymentAndCreateOrder = async (req, res) => {
  const { items, shippingAddress, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const razorpay = getRazorpayClient();

  if (razorpay.error) {
    return res.status(razorpay.error.status).json({ message: razorpay.error.message });
  }

  if (!validateShippingAddress(shippingAddress)) {
    return res.status(400).json({ message: 'Complete shipping address is required' });
  }

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Payment verification fields are required' });
  }

  const expectedSignature = crypto
    .createHmac('sha256', razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({ message: 'Invalid Razorpay signature' });
  }

  const existingOrder = await Order.findOne({
    'paymentResult.razorpayPaymentId': razorpayPaymentId
  });
  if (existingOrder) {
    return res.status(409).json({ message: 'This payment is already processed' });
  }

  const prepared = await prepareOrderItems(items);
  if (prepared.error) {
    return res.status(prepared.error.status).json({ message: prepared.error.message });
  }

  let payment;
  try {
    payment = await razorpay.client.payments.fetch(razorpayPaymentId);
  } catch {
    return res.status(400).json({ message: 'Unable to verify payment with Razorpay' });
  }

  if (!payment || payment.order_id !== razorpayOrderId) {
    return res.status(400).json({ message: 'Payment/order mismatch' });
  }
  if (!['captured', 'authorized'].includes(payment.status)) {
    return res.status(400).json({ message: 'Payment is not completed' });
  }

  const expectedAmount = Math.round(prepared.totalPrice * 100);
  if (payment.amount !== expectedAmount) {
    return res.status(400).json({ message: 'Payment amount does not match order total' });
  }

  const saved = await createStoredOrder({
    userId: req.user._id,
    items,
    shippingAddress,
    paymentMethod: 'Razorpay',
    status: 'paid',
    paidAt: new Date(),
    paymentResult: {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    }
  });

  if (saved.error) {
    return res.status(saved.error.status).json({ message: saved.error.message });
  }

  return res.status(201).json({
    message: 'Payment verified and order placed',
    order: saved.order
  });
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
  createRazorpayOrder,
  verifyRazorpayPaymentAndCreateOrder,
  getMyOrders,
  getAllOrders
};
