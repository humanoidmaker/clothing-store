const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');

const ORDER_STATUSES = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];

const validateShippingAddress = (shippingAddress) => {
  const requiredKeys = ['street', 'city', 'state', 'postalCode', 'country'];

  if (!shippingAddress) return false;

  return requiredKeys.every((key) => String(shippingAddress[key] || '').trim().length > 0);
};

const findVariantIndex = (product, selectedSize, selectedColor) => {
  if (!Array.isArray(product.variants) || product.variants.length === 0) {
    return -1;
  }

  if (!selectedSize) {
    return -1;
  }

  const matchesBySize = product.variants
    .map((variant, index) => ({ variant, index }))
    .filter((entry) => entry.variant.size === selectedSize);

  if (matchesBySize.length === 0) {
    return -1;
  }

  if (!selectedColor) {
    return matchesBySize[0].index;
  }

  const exactColor = matchesBySize.find((entry) => String(entry.variant.color || '') === selectedColor);
  return exactColor ? exactColor.index : -1;
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

    let selectedSize = String(item.selectedSize || '').trim();
    let selectedColor = String(item.selectedColor || '').trim();
    let unitPrice = Number(product.price);
    let availableStock = Number(product.countInStock);
    let variantIndex = -1;

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

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      if (!selectedSize) {
        return { error: { status: 400, message: `Please select size for ${product.name}` } };
      }

      variantIndex = findVariantIndex(product, selectedSize, selectedColor);
      if (variantIndex < 0) {
        return { error: { status: 400, message: `Selected variant not found for ${product.name}` } };
      }

      const variant = product.variants[variantIndex];
      unitPrice = Number(variant.price);
      availableStock = Number(variant.stock || 0);
      if (!selectedColor && variant.color) {
        selectedColor = variant.color;
      }
    }

    if (availableStock < quantity) {
      return { error: { status: 400, message: `${product.name} is out of stock for selected size` } };
    }

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.image,
      price: unitPrice,
      quantity,
      selectedSize,
      selectedColor
    });

    stockUpdates.push({ product, quantity, variantIndex });
    totalPrice += unitPrice * quantity;
  }

  return { orderItems, stockUpdates, totalPrice };
};

const deductStock = async (stockUpdates) => {
  for (const update of stockUpdates) {
    if (Number.isInteger(update.variantIndex) && update.variantIndex >= 0) {
      const variant = update.product.variants[update.variantIndex];

      if (!variant || Number(variant.stock) < update.quantity) {
        throw new Error('Selected variant stock changed, please retry checkout');
      }

      variant.stock -= update.quantity;
      update.product.markModified('variants');
      update.product.countInStock = update.product.variants.reduce(
        (sum, currentVariant) => sum + Number(currentVariant.stock || 0),
        0
      );
    } else {
      update.product.countInStock -= update.quantity;
    }

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

  try {
    await deductStock(prepared.stockUpdates);
  } catch (error) {
    return { error: { status: 400, message: error.message || 'Unable to reserve stock for order' } };
  }

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

const updateOrderStatus = async (req, res) => {
  const { status } = req.body;

  if (!status || typeof status !== 'string') {
    return res.status(400).json({ message: 'Order status is required' });
  }

  const normalizedStatus = status.trim().toLowerCase();
  if (!ORDER_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      message: `Invalid status. Allowed values: ${ORDER_STATUSES.join(', ')}`
    });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.status = normalizedStatus;
  if (normalizedStatus === 'paid' && !order.paidAt) {
    order.paidAt = new Date();
  }

  const updatedOrder = await order.save();
  const populatedOrder = await updatedOrder.populate('user', 'name email');
  return res.json(populatedOrder);
};

module.exports = {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPaymentAndCreateOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus
};
