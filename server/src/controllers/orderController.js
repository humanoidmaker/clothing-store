const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');

const ORDER_STATUSES = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];
const PROFIT_STATUSES = ['paid', 'shipped', 'delivered'];
const PIPELINE_STATUSES = ['pending', 'processing'];
const REPORT_INTERVALS = ['day', 'week', 'month'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const normalizeQueryValue = (value) => String(value || '').trim();

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const parseDateBoundary = (value, boundary = 'start') => {
  const rawValue = normalizeQueryValue(value);
  if (!rawValue) {
    return null;
  }

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const hasExplicitTime = rawValue.includes('T');
  if (!hasExplicitTime) {
    if (boundary === 'end') {
      parsedDate.setUTCHours(23, 59, 59, 999);
    } else {
      parsedDate.setUTCHours(0, 0, 0, 0);
    }
  }

  return parsedDate;
};

const getIsoWeek = (date) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return { isoYear, week };
};

const getTrendBucket = (dateValue, interval) => {
  const date = new Date(dateValue);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');

  if (interval === 'month') {
    return {
      key: `${year}-${paddedMonth}`,
      label: `${MONTH_LABELS[month - 1]} ${year}`,
      sortOrder: year * 100 + month
    };
  }

  if (interval === 'week') {
    const { isoYear, week } = getIsoWeek(date);
    const paddedWeek = String(week).padStart(2, '0');
    return {
      key: `${isoYear}-W${paddedWeek}`,
      label: `W${paddedWeek} ${isoYear}`,
      sortOrder: isoYear * 100 + week
    };
  }

  return {
    key: `${year}-${paddedMonth}-${paddedDay}`,
    label: `${paddedDay} ${MONTH_LABELS[month - 1]}`,
    sortOrder: Date.UTC(year, month - 1, day)
  };
};

const prepareOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: { status: 400, message: 'Order items are required' } };
  }

  const orderItems = [];
  const stockUpdates = [];
  const productCache = new Map();
  let totalPrice = 0;

  for (const item of items) {
    const productId = String(item.productId || '').trim();
    if (!productId) {
      return { error: { status: 400, message: 'Invalid product id in order items' } };
    }

    let product = productCache.get(productId);
    if (!product) {
      product = await Product.findById(productId);
      productCache.set(productId, product || null);
    }

    if (!product) {
      return { error: { status: 404, message: `Product not found: ${productId}` } };
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

    stockUpdates.push({ productId, product, quantity, variantIndex });
    totalPrice += unitPrice * quantity;
  }

  return { orderItems, stockUpdates, totalPrice };
};

const deductStock = async (stockUpdates) => {
  const groupedUpdates = new Map();

  for (const update of stockUpdates) {
    const key = String(update.productId || update.product?._id || '').trim();
    if (!key) {
      continue;
    }

    if (!groupedUpdates.has(key)) {
      groupedUpdates.set(key, { product: update.product, updates: [] });
    }

    groupedUpdates.get(key).updates.push(update);
  }

  for (const entry of groupedUpdates.values()) {
    const { product, updates } = entry;
    if (!product) {
      throw new Error('Product no longer exists, please retry checkout');
    }

    let touchedVariants = false;

    for (const update of updates) {
      if (Number.isInteger(update.variantIndex) && update.variantIndex >= 0) {
        const variant = product.variants[update.variantIndex];

        if (!variant || Number(variant.stock) < update.quantity) {
          throw new Error('Selected variant stock changed, please retry checkout');
        }

        variant.stock -= update.quantity;
        touchedVariants = true;
      } else {
        const availableStock = Number(product.countInStock || 0);
        if (availableStock < update.quantity) {
          throw new Error('Product stock changed, please retry checkout');
        }
        product.countInStock = availableStock - update.quantity;
      }
    }

    if (touchedVariants) {
      product.markModified('variants');
      product.countInStock = product.variants.reduce(
        (sum, currentVariant) => sum + Number(currentVariant.stock || 0),
        0
      );
    }

    await product.save();
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

const getMyOrderById = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  return res.json(order);
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

const getOrderReports = async (req, res) => {
  const normalizedStatus = normalizeQueryValue(req.query.status).toLowerCase() || 'all';
  const normalizedInterval = normalizeQueryValue(req.query.interval).toLowerCase() || 'day';
  const normalizedPaymentMethod = normalizeQueryValue(req.query.paymentMethod);

  if (normalizedStatus !== 'all' && !ORDER_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      message: `Invalid status filter. Allowed values: all, ${ORDER_STATUSES.join(', ')}`
    });
  }

  if (!REPORT_INTERVALS.includes(normalizedInterval)) {
    return res.status(400).json({
      message: `Invalid interval filter. Allowed values: ${REPORT_INTERVALS.join(', ')}`
    });
  }

  const fromDate = parseDateBoundary(req.query.from, 'start');
  const toDate = parseDateBoundary(req.query.to, 'end');

  if (req.query.from && !fromDate) {
    return res.status(400).json({ message: 'Invalid "from" date filter' });
  }

  if (req.query.to && !toDate) {
    return res.status(400).json({ message: 'Invalid "to" date filter' });
  }

  if (fromDate && toDate && fromDate > toDate) {
    return res.status(400).json({ message: '"from" date cannot be after "to" date' });
  }

  const query = {};
  if (normalizedStatus !== 'all') {
    query.status = normalizedStatus;
  }

  if (normalizedPaymentMethod && normalizedPaymentMethod.toLowerCase() !== 'all') {
    query.paymentMethod = normalizedPaymentMethod;
  }

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      query.createdAt.$gte = fromDate;
    }
    if (toDate) {
      query.createdAt.$lte = toDate;
    }
  }

  const orders = await Order.find(query).select('status totalPrice createdAt paymentMethod orderItems');

  const statusBreakdownMap = new Map(
    ORDER_STATUSES.map((status) => [
      status,
      {
        status,
        count: 0,
        revenue: 0
      }
    ])
  );
  const paymentBreakdownMap = new Map();
  const trendMap = new Map();
  const topProductsMap = new Map();

  let grossRevenue = 0;
  let profitRevenue = 0;
  let lossRevenue = 0;
  let pipelineRevenue = 0;
  let totalUnits = 0;
  let soldUnits = 0;
  let cancelledUnits = 0;

  for (const order of orders) {
    const orderStatus = ORDER_STATUSES.includes(order.status) ? order.status : 'pending';
    const orderTotal = Number(order.totalPrice || 0);
    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
    const paymentMethod = normalizeQueryValue(order.paymentMethod) || 'Unknown';
    const isCancelled = orderStatus === 'cancelled';

    grossRevenue += orderTotal;
    if (PROFIT_STATUSES.includes(orderStatus)) {
      profitRevenue += orderTotal;
    }
    if (PIPELINE_STATUSES.includes(orderStatus)) {
      pipelineRevenue += orderTotal;
    }
    if (isCancelled) {
      lossRevenue += orderTotal;
    }

    const statusEntry = statusBreakdownMap.get(orderStatus);
    statusEntry.count += 1;
    statusEntry.revenue += orderTotal;

    if (!paymentBreakdownMap.has(paymentMethod)) {
      paymentBreakdownMap.set(paymentMethod, {
        paymentMethod,
        count: 0,
        revenue: 0
      });
    }
    const paymentEntry = paymentBreakdownMap.get(paymentMethod);
    paymentEntry.count += 1;
    paymentEntry.revenue += orderTotal;

    const unitCount = orderItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    totalUnits += unitCount;
    if (isCancelled) {
      cancelledUnits += unitCount;
    } else {
      soldUnits += unitCount;
    }

    for (const item of orderItems) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) {
        continue;
      }

      const itemRevenue = Number(item.price || 0) * quantity;
      const productId = String(item.product || '').trim();
      const productKey = productId || `name:${normalizeQueryValue(item.name).toLowerCase() || 'unknown'}`;

      if (!topProductsMap.has(productKey)) {
        topProductsMap.set(productKey, {
          productId,
          name: normalizeQueryValue(item.name) || 'Unnamed product',
          units: 0,
          revenue: 0,
          cancelledUnits: 0,
          cancelledRevenue: 0
        });
      }

      const productEntry = topProductsMap.get(productKey);
      if (isCancelled) {
        productEntry.cancelledUnits += quantity;
        productEntry.cancelledRevenue += itemRevenue;
      } else {
        productEntry.units += quantity;
        productEntry.revenue += itemRevenue;
      }
    }

    const bucket = getTrendBucket(order.createdAt, normalizedInterval);
    if (!trendMap.has(bucket.key)) {
      trendMap.set(bucket.key, {
        key: bucket.key,
        label: bucket.label,
        sortOrder: bucket.sortOrder,
        orders: 0,
        revenue: 0,
        profit: 0,
        loss: 0,
        pipeline: 0
      });
    }

    const trendEntry = trendMap.get(bucket.key);
    trendEntry.orders += 1;
    trendEntry.revenue += orderTotal;
    if (PROFIT_STATUSES.includes(orderStatus)) {
      trendEntry.profit += orderTotal;
    }
    if (isCancelled) {
      trendEntry.loss += orderTotal;
    }
    if (PIPELINE_STATUSES.includes(orderStatus)) {
      trendEntry.pipeline += orderTotal;
    }
  }

  const totalOrders = orders.length;
  const cancelledCount = statusBreakdownMap.get('cancelled')?.count || 0;
  const netRevenue = grossRevenue - lossRevenue;
  const netProfitLoss = profitRevenue - lossRevenue;
  const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

  const statusBreakdown = Array.from(statusBreakdownMap.values()).map((entry) => ({
    ...entry,
    revenue: roundCurrency(entry.revenue)
  }));

  const paymentBreakdown = Array.from(paymentBreakdownMap.values())
    .map((entry) => ({
      ...entry,
      revenue: roundCurrency(entry.revenue)
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const trend = Array.from(trendMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      orders: entry.orders,
      revenue: roundCurrency(entry.revenue),
      profit: roundCurrency(entry.profit),
      loss: roundCurrency(entry.loss),
      pipeline: roundCurrency(entry.pipeline),
      netProfitLoss: roundCurrency(entry.profit - entry.loss)
    }));

  const topProducts = Array.from(topProductsMap.values())
    .map((entry) => ({
      ...entry,
      revenue: roundCurrency(entry.revenue),
      cancelledRevenue: roundCurrency(entry.cancelledRevenue)
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }
      return b.units - a.units;
    })
    .slice(0, 10);

  return res.json({
    filters: {
      from: fromDate ? fromDate.toISOString() : null,
      to: toDate ? toDate.toISOString() : null,
      status: normalizedStatus,
      paymentMethod: normalizedPaymentMethod || 'all',
      interval: normalizedInterval
    },
    totals: {
      totalOrders,
      grossRevenue: roundCurrency(grossRevenue),
      profitRevenue: roundCurrency(profitRevenue),
      lossRevenue: roundCurrency(lossRevenue),
      netRevenue: roundCurrency(netRevenue),
      netProfitLoss: roundCurrency(netProfitLoss),
      pipelineRevenue: roundCurrency(pipelineRevenue),
      averageOrderValue: roundCurrency(averageOrderValue),
      totalUnits,
      soldUnits,
      cancelledUnits,
      cancellationRate: roundCurrency(cancellationRate)
    },
    statusBreakdown,
    paymentBreakdown,
    trend,
    topProducts
  });
};

module.exports = {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPaymentAndCreateOrder,
  getMyOrders,
  getMyOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderReports
};
