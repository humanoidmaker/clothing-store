const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');
const StoreSettings = require('../models/StoreSettings');
const { decryptSettingValue } = require('../utils/secureSettings');

const ORDER_STATUSES = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];
const PROFIT_STATUSES = ['paid', 'shipped', 'delivered'];
const PIPELINE_STATUSES = ['pending', 'processing'];
const REPORT_INTERVALS = ['day', 'week', 'month'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COD_CHARGE_PER_PRODUCT = 25;
const SETTINGS_SINGLETON_QUERY = { singletonKey: 'default' };
const DEFAULT_PAYMENT_GATEWAYS = StoreSettings.defaultPaymentGatewaySettings || {
  cashOnDelivery: { enabled: true },
  razorpay: {
    enabled: true,
    mode: 'test',
    test: { keyId: '', keySecretEncrypted: '' },
    live: { keyId: '', keySecretEncrypted: '' },
    updatedAt: null
  },
  stripe: {
    enabled: false,
    mode: 'test',
    test: { publishableKey: '', secretKeyEncrypted: '', webhookSecretEncrypted: '' },
    live: { publishableKey: '', secretKeyEncrypted: '', webhookSecretEncrypted: '' },
    updatedAt: null
  },
  paypal: { enabled: false, clientId: '', clientSecretEncrypted: '', environment: 'sandbox', updatedAt: null },
  payu: { enabled: false, merchantKey: '', merchantSaltEncrypted: '', environment: 'test', updatedAt: null },
  cashfree: { enabled: false, appId: '', secretKeyEncrypted: '', environment: 'sandbox', updatedAt: null },
  phonepe: { enabled: false, merchantId: '', saltKeyEncrypted: '', saltIndex: '1', environment: 'sandbox', updatedAt: null }
};
const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: 'Cash on Delivery',
  razorpay: 'Razorpay',
  stripe: 'Stripe',
  paypal: 'PayPal',
  payu: 'PayU',
  cashfree: 'Cashfree',
  phonepe: 'PhonePe'
};

const trimOrEmpty = (value) => String(value || '').trim();

const normalizeAddressInput = (address = {}, fallback = {}) => ({
  fullName: trimOrEmpty(address.fullName || fallback.fullName || ''),
  phone: trimOrEmpty(address.phone || fallback.phone || ''),
  email: trimOrEmpty(address.email || fallback.email || ''),
  street: trimOrEmpty(address.street || fallback.street || ''),
  addressLine2: trimOrEmpty(address.addressLine2 || fallback.addressLine2 || ''),
  city: trimOrEmpty(address.city || fallback.city || ''),
  state: trimOrEmpty(address.state || fallback.state || ''),
  postalCode: trimOrEmpty(address.postalCode || fallback.postalCode || ''),
  country: trimOrEmpty(address.country || fallback.country || '')
});

const validateAddressRequiredFields = (address, requiredFields, label) => {
  const missing = requiredFields.filter((field) => !trimOrEmpty(address?.[field]));
  if (missing.length > 0) {
    throw new Error(`${label} is incomplete. Missing: ${missing.join(', ')}`);
  }
};

const normalizeCheckoutDetails = (payload = {}, user = {}) => {
  const shippingAddress = normalizeAddressInput(payload.shippingAddress, {
    fullName: trimOrEmpty(user?.name || ''),
    email: trimOrEmpty(user?.email || '')
  });
  validateAddressRequiredFields(
    shippingAddress,
    ['fullName', 'phone', 'street', 'city', 'state', 'postalCode', 'country'],
    'Shipping address'
  );

  const sameAsShipping = payload?.billingDetails?.sameAsShipping !== false;
  const billingAddress = sameAsShipping
    ? normalizeAddressInput(shippingAddress)
    : normalizeAddressInput(payload?.billingDetails || {}, {
        email: shippingAddress.email
      });
  validateAddressRequiredFields(
    billingAddress,
    ['fullName', 'phone', 'street', 'city', 'state', 'postalCode', 'country'],
    'Billing details'
  );

  const businessPurchase = Boolean(payload?.taxDetails?.businessPurchase);
  const taxDetails = {
    businessPurchase,
    businessName: trimOrEmpty(payload?.taxDetails?.businessName || ''),
    gstin: trimOrEmpty(payload?.taxDetails?.gstin || '').toUpperCase(),
    pan: trimOrEmpty(payload?.taxDetails?.pan || '').toUpperCase(),
    purchaseOrderNumber: trimOrEmpty(payload?.taxDetails?.purchaseOrderNumber || ''),
    notes: trimOrEmpty(payload?.taxDetails?.notes || '')
  };

  if (businessPurchase && !taxDetails.gstin) {
    throw new Error('GSTIN is required for business purchase');
  }

  return {
    shippingAddress,
    billingDetails: {
      sameAsShipping,
      ...billingAddress
    },
    taxDetails,
    codChargesAccepted: Boolean(payload?.codChargesAccepted)
  };
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
    let unitPurchasePrice = Number(product.purchasePrice || 0);
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
      unitPurchasePrice = Number(variant.purchasePrice ?? product.purchasePrice ?? 0);
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
      purchasePrice: Number.isFinite(unitPurchasePrice) && unitPurchasePrice >= 0 ? unitPurchasePrice : 0,
      quantity,
      selectedSize,
      selectedColor
    });

    stockUpdates.push({ productId, product, quantity, variantIndex });
    totalPrice += unitPrice * quantity;
  }

  return { orderItems, stockUpdates, totalPrice };
};

const computeCodCharge = (preparedOrder) => {
  const totalUnits = Array.isArray(preparedOrder?.orderItems)
    ? preparedOrder.orderItems.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity || 0)), 0)
    : 0;
  return Math.max(0, Number(totalUnits || 0)) * COD_CHARGE_PER_PRODUCT;
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
  billingDetails,
  taxDetails,
  paymentMethod,
  codCharge = 0,
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

  const normalizedCodCharge = Number.isFinite(Number(codCharge)) ? Math.max(0, Number(codCharge)) : 0;
  const itemsTotal = Number(prepared.totalPrice || 0);
  const finalTotal = Number((itemsTotal + normalizedCodCharge).toFixed(2));

  const order = await Order.create({
    user: userId,
    orderItems: prepared.orderItems,
    shippingAddress,
    billingDetails,
    taxDetails,
    paymentMethod,
    totalPrice: finalTotal,
    pricing: {
      itemsTotal,
      codCharge: normalizedCodCharge,
      finalTotal
    },
    status,
    paidAt,
    paymentResult
  });

  return { order };
};

const getRazorpayClient = async () => {
  try {
    const settings = await StoreSettings.findOne(SETTINGS_SINGLETON_QUERY).select('paymentGateways razorpay');
    const normalized = normalizeStoredGatewaySettings(settings || {});
    const activeRazorpayConfig = normalized.razorpay.mode === 'live' ? normalized.razorpay.live : normalized.razorpay.test;
    const keyId = String(activeRazorpayConfig?.keyId || '').trim();
    const encryptedSecret = String(activeRazorpayConfig?.keySecretEncrypted || '').trim();

    if (!normalized.razorpay.enabled || !keyId || !encryptedSecret) {
      return { error: { status: 500, message: 'Razorpay keys are not configured in admin settings' } };
    }

    let keySecret = '';
    try {
      keySecret = decryptSettingValue(encryptedSecret);
    } catch (decryptionError) {
      return {
        error: {
          status: 500,
          message: decryptionError.message || 'Unable to decrypt Razorpay keys from store settings'
        }
      };
    }

    if (!keySecret) {
      return { error: { status: 500, message: 'Razorpay keys are not configured in admin settings' } };
    }

    return {
      keyId,
      keySecret,
      client: new Razorpay({
        key_id: keyId,
        key_secret: keySecret
      })
    };
  } catch (error) {
    return { error: { status: 500, message: error.message || 'Unable to load Razorpay configuration from database' } };
  }
};

const createOrder = async (req, res) => {
  const { items, paymentMethod } = req.body;
  let checkoutDetails;
  try {
    checkoutDetails = normalizeCheckoutDetails(req.body || {}, req.user || {});
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid checkout details' });
  }

  const resolvedGateway = normalizeGatewayId(paymentMethod || 'cash_on_delivery');
  let codCharge = 0;
  if (resolvedGateway === 'cash_on_delivery') {
    const preparedForCod = await prepareOrderItems(items);
    if (preparedForCod.error) {
      return res.status(preparedForCod.error.status).json({ message: preparedForCod.error.message });
    }
    codCharge = computeCodCharge(preparedForCod);
    if (codCharge > 0 && !checkoutDetails.codChargesAccepted) {
      return res.status(400).json({
        message: `Please confirm Cash on Delivery convenience charges of INR ${codCharge}`
      });
    }
  }

  const saved = await createStoredOrder({
    userId: req.user._id,
    items,
    shippingAddress: checkoutDetails.shippingAddress,
    billingDetails: checkoutDetails.billingDetails,
    taxDetails: checkoutDetails.taxDetails,
    paymentMethod: paymentMethod || PAYMENT_METHOD_LABELS.cash_on_delivery,
    codCharge
  });

  if (saved.error) {
    return res.status(saved.error.status).json({ message: saved.error.message });
  }

  return res.status(201).json(saved.order);
};

const createRazorpayOrder = async (req, res) => {
  const { items } = req.body;
  const razorpay = await getRazorpayClient();

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
  const { items, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const razorpay = await getRazorpayClient();

  if (razorpay.error) {
    return res.status(razorpay.error.status).json({ message: razorpay.error.message });
  }

  let checkoutDetails;
  try {
    checkoutDetails = normalizeCheckoutDetails(req.body || {}, req.user || {});
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid checkout details' });
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
    shippingAddress: checkoutDetails.shippingAddress,
    billingDetails: checkoutDetails.billingDetails,
    taxDetails: checkoutDetails.taxDetails,
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

const cloneGatewayDefaults = () => JSON.parse(JSON.stringify(DEFAULT_PAYMENT_GATEWAYS));

const normalizeGatewayId = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (['cod', 'cash on delivery', 'cash_on_delivery'].includes(raw)) {
    return 'cash_on_delivery';
  }
  return raw;
};

const normalizeStoredGatewaySettings = (settingsDoc = {}) => {
  const defaults = cloneGatewayDefaults();
  const stored = settingsDoc?.paymentGateways || {};
  const legacyRazorpay = settingsDoc?.razorpay || {};
  const razorpayMode = ['test', 'live'].includes(String(stored?.razorpay?.mode || '').trim().toLowerCase())
    ? String(stored.razorpay.mode).trim().toLowerCase()
    : defaults.razorpay.mode;
  const stripeMode = ['test', 'live'].includes(String(stored?.stripe?.mode || '').trim().toLowerCase())
    ? String(stored.stripe.mode).trim().toLowerCase()
    : defaults.stripe.mode;

  const normalized = {
    cashOnDelivery: {
      enabled:
        typeof stored?.cashOnDelivery?.enabled === 'boolean'
          ? stored.cashOnDelivery.enabled
          : defaults.cashOnDelivery.enabled
    },
    razorpay: {
      enabled: typeof stored?.razorpay?.enabled === 'boolean' ? stored.razorpay.enabled : defaults.razorpay.enabled,
      mode: razorpayMode,
      test: {
        keyId: String(stored?.razorpay?.test?.keyId || stored?.razorpay?.keyId || '').trim(),
        keySecretEncrypted: String(
          stored?.razorpay?.test?.keySecretEncrypted || stored?.razorpay?.keySecretEncrypted || ''
        ).trim()
      },
      live: {
        keyId: String(stored?.razorpay?.live?.keyId || '').trim(),
        keySecretEncrypted: String(stored?.razorpay?.live?.keySecretEncrypted || '').trim()
      },
      updatedAt: stored?.razorpay?.updatedAt || null
    },
    stripe: {
      enabled: typeof stored?.stripe?.enabled === 'boolean' ? stored.stripe.enabled : defaults.stripe.enabled,
      mode: stripeMode,
      test: {
        publishableKey: String(stored?.stripe?.test?.publishableKey || stored?.stripe?.publishableKey || '').trim(),
        secretKeyEncrypted: String(
          stored?.stripe?.test?.secretKeyEncrypted || stored?.stripe?.secretKeyEncrypted || ''
        ).trim(),
        webhookSecretEncrypted: String(
          stored?.stripe?.test?.webhookSecretEncrypted || stored?.stripe?.webhookSecretEncrypted || ''
        ).trim()
      },
      live: {
        publishableKey: String(stored?.stripe?.live?.publishableKey || '').trim(),
        secretKeyEncrypted: String(stored?.stripe?.live?.secretKeyEncrypted || '').trim(),
        webhookSecretEncrypted: String(stored?.stripe?.live?.webhookSecretEncrypted || '').trim()
      },
      updatedAt: stored?.stripe?.updatedAt || null
    },
    paypal: {
      enabled: typeof stored?.paypal?.enabled === 'boolean' ? stored.paypal.enabled : defaults.paypal.enabled,
      clientId: String(stored?.paypal?.clientId || '').trim(),
      clientSecretEncrypted: String(stored?.paypal?.clientSecretEncrypted || '').trim(),
      environment:
        ['sandbox', 'live'].includes(String(stored?.paypal?.environment || '').trim().toLowerCase())
          ? String(stored.paypal.environment).trim().toLowerCase()
          : defaults.paypal.environment,
      updatedAt: stored?.paypal?.updatedAt || null
    },
    payu: {
      enabled: typeof stored?.payu?.enabled === 'boolean' ? stored.payu.enabled : defaults.payu.enabled,
      merchantKey: String(stored?.payu?.merchantKey || '').trim(),
      merchantSaltEncrypted: String(stored?.payu?.merchantSaltEncrypted || '').trim(),
      environment:
        ['test', 'live'].includes(String(stored?.payu?.environment || '').trim().toLowerCase())
          ? String(stored.payu.environment).trim().toLowerCase()
          : defaults.payu.environment,
      updatedAt: stored?.payu?.updatedAt || null
    },
    cashfree: {
      enabled: typeof stored?.cashfree?.enabled === 'boolean' ? stored.cashfree.enabled : defaults.cashfree.enabled,
      appId: String(stored?.cashfree?.appId || '').trim(),
      secretKeyEncrypted: String(stored?.cashfree?.secretKeyEncrypted || '').trim(),
      environment:
        ['sandbox', 'production'].includes(String(stored?.cashfree?.environment || '').trim().toLowerCase())
          ? String(stored.cashfree.environment).trim().toLowerCase()
          : defaults.cashfree.environment,
      updatedAt: stored?.cashfree?.updatedAt || null
    },
    phonepe: {
      enabled: typeof stored?.phonepe?.enabled === 'boolean' ? stored.phonepe.enabled : defaults.phonepe.enabled,
      merchantId: String(stored?.phonepe?.merchantId || '').trim(),
      saltKeyEncrypted: String(stored?.phonepe?.saltKeyEncrypted || '').trim(),
      saltIndex: String(stored?.phonepe?.saltIndex || '').trim() || defaults.phonepe.saltIndex,
      environment:
        ['sandbox', 'production'].includes(String(stored?.phonepe?.environment || '').trim().toLowerCase())
          ? String(stored.phonepe.environment).trim().toLowerCase()
          : defaults.phonepe.environment,
      updatedAt: stored?.phonepe?.updatedAt || null
    }
  };

  if (!normalized.razorpay.test.keyId) {
    normalized.razorpay.test.keyId = String(legacyRazorpay?.keyId || '').trim();
  }
  if (!normalized.razorpay.test.keySecretEncrypted) {
    normalized.razorpay.test.keySecretEncrypted = String(legacyRazorpay?.keySecretEncrypted || '').trim();
  }

  return normalized;
};

const parseJsonSafely = async (response) => {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return { rawText };
  }
};

const decryptSecret = (encryptedValue) => {
  const value = String(encryptedValue || '').trim();
  if (!value) {
    return '';
  }
  return decryptSettingValue(value);
};

const loadPaymentGatewayConfig = async () => {
  const settings = await StoreSettings.findOne(SETTINGS_SINGLETON_QUERY).select('paymentGateways razorpay');
  const normalized = normalizeStoredGatewaySettings(settings || {});
  const activeRazorpayConfig = normalized.razorpay.mode === 'live' ? normalized.razorpay.live : normalized.razorpay.test;
  const activeStripeConfig = normalized.stripe.mode === 'live' ? normalized.stripe.live : normalized.stripe.test;

  return {
    cashOnDelivery: {
      enabled: Boolean(normalized.cashOnDelivery.enabled)
    },
    razorpay: {
      enabled: Boolean(normalized.razorpay.enabled),
      mode: normalized.razorpay.mode,
      keyId: activeRazorpayConfig.keyId,
      keySecret: decryptSecret(activeRazorpayConfig.keySecretEncrypted),
      configured: Boolean(activeRazorpayConfig.keyId && activeRazorpayConfig.keySecretEncrypted)
    },
    stripe: {
      enabled: Boolean(normalized.stripe.enabled),
      mode: normalized.stripe.mode,
      publishableKey: activeStripeConfig.publishableKey,
      secretKey: decryptSecret(activeStripeConfig.secretKeyEncrypted),
      webhookSecret: decryptSecret(activeStripeConfig.webhookSecretEncrypted),
      configured: Boolean(activeStripeConfig.publishableKey && activeStripeConfig.secretKeyEncrypted)
    },
    paypal: {
      enabled: Boolean(normalized.paypal.enabled),
      clientId: normalized.paypal.clientId,
      clientSecret: decryptSecret(normalized.paypal.clientSecretEncrypted),
      environment: normalized.paypal.environment,
      configured: Boolean(normalized.paypal.clientId && normalized.paypal.clientSecretEncrypted)
    },
    payu: {
      enabled: Boolean(normalized.payu.enabled),
      merchantKey: normalized.payu.merchantKey,
      merchantSalt: decryptSecret(normalized.payu.merchantSaltEncrypted),
      environment: normalized.payu.environment,
      configured: Boolean(normalized.payu.merchantKey && normalized.payu.merchantSaltEncrypted)
    },
    cashfree: {
      enabled: Boolean(normalized.cashfree.enabled),
      appId: normalized.cashfree.appId,
      secretKey: decryptSecret(normalized.cashfree.secretKeyEncrypted),
      environment: normalized.cashfree.environment,
      configured: Boolean(normalized.cashfree.appId && normalized.cashfree.secretKeyEncrypted)
    },
    phonepe: {
      enabled: Boolean(normalized.phonepe.enabled),
      merchantId: normalized.phonepe.merchantId,
      saltKey: decryptSecret(normalized.phonepe.saltKeyEncrypted),
      saltIndex: normalized.phonepe.saltIndex,
      environment: normalized.phonepe.environment,
      configured: Boolean(normalized.phonepe.merchantId && normalized.phonepe.saltKeyEncrypted)
    }
  };
};

const resolveClientBaseUrl = (req) => {
  const explicit = String(process.env.CLIENT_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
};

const resolveApiBaseUrl = (req) => `${req.protocol}://${req.get('host')}/api`;

const getPaymentGatewayOptions = async (req, res) => {
  let config;
  try {
    config = await loadPaymentGatewayConfig();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to load payment gateway settings' });
  }

  const methods = [];
  if (config.cashOnDelivery.enabled) {
    methods.push({
      id: 'cash_on_delivery',
      label: PAYMENT_METHOD_LABELS.cash_on_delivery,
      flow: 'direct',
      configured: true
    });
  }
  if (config.razorpay.enabled) {
    methods.push({
      id: 'razorpay',
      label: PAYMENT_METHOD_LABELS.razorpay,
      flow: 'razorpay_popup',
      configured: Boolean(config.razorpay.configured)
    });
  }
  if (config.stripe.enabled) {
    methods.push({
      id: 'stripe',
      label: PAYMENT_METHOD_LABELS.stripe,
      flow: 'redirect',
      configured: Boolean(config.stripe.configured)
    });
  }
  if (config.paypal.enabled) {
    methods.push({
      id: 'paypal',
      label: PAYMENT_METHOD_LABELS.paypal,
      flow: 'redirect',
      configured: Boolean(config.paypal.configured)
    });
  }
  if (config.payu.enabled) {
    methods.push({
      id: 'payu',
      label: PAYMENT_METHOD_LABELS.payu,
      flow: 'form_post',
      configured: Boolean(config.payu.configured)
    });
  }
  if (config.cashfree.enabled) {
    methods.push({
      id: 'cashfree',
      label: PAYMENT_METHOD_LABELS.cashfree,
      flow: 'redirect',
      configured: Boolean(config.cashfree.configured)
    });
  }
  if (config.phonepe.enabled) {
    methods.push({
      id: 'phonepe',
      label: PAYMENT_METHOD_LABELS.phonepe,
      flow: 'redirect',
      configured: Boolean(config.phonepe.configured)
    });
  }

  return res.json({
    methods,
    codCharges: {
      perProduct: COD_CHARGE_PER_PRODUCT,
      currency: 'INR'
    }
  });
};

const createPaymentIntent = async (req, res) => {
  const gateway = normalizeGatewayId(req.body?.gateway);
  const { items } = req.body;

  if (!gateway) {
    return res.status(400).json({ message: 'Payment gateway is required' });
  }
  let checkoutDetails;
  try {
    checkoutDetails = normalizeCheckoutDetails(req.body || {}, req.user || {});
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid checkout details' });
  }

  const prepared = await prepareOrderItems(items);
  if (prepared.error) {
    return res.status(prepared.error.status).json({ message: prepared.error.message });
  }
  const amountPaise = Math.round(prepared.totalPrice * 100);
  if (amountPaise < 100) {
    return res.status(400).json({ message: 'Order amount must be at least INR 1.00' });
  }

  let config;
  try {
    config = await loadPaymentGatewayConfig();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to load payment gateway settings' });
  }

  if (gateway === 'cash_on_delivery') {
    if (!config.cashOnDelivery.enabled) {
      return res.status(400).json({ message: 'Cash on Delivery is currently disabled' });
    }
    const codCharge = computeCodCharge(prepared);
    if (codCharge > 0 && !checkoutDetails.codChargesAccepted) {
      return res.status(400).json({
        message: `Please confirm Cash on Delivery convenience charges of INR ${codCharge}`
      });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.cash_on_delivery,
      codCharge
    });

    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }

    return res.status(201).json({
      gateway,
      flow: 'direct',
      order: saved.order,
      codCharge
    });
  }

  if (gateway === 'razorpay') {
    if (!config.razorpay.enabled || !config.razorpay.configured) {
      return res.status(400).json({ message: 'Razorpay is currently not configured' });
    }

    const receipt = `rcpt_${Date.now()}_${String(req.user._id).slice(-6)}`.slice(0, 40);
    const razorpayClient = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret
    });

    let razorpayOrder;
    try {
      razorpayOrder = await razorpayClient.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt
      });
    } catch {
      return res.status(502).json({ message: 'Failed to create Razorpay order' });
    }

    return res.json({
      gateway,
      flow: 'razorpay_popup',
      keyId: config.razorpay.keyId,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  }

  if (gateway === 'stripe') {
    if (!config.stripe.enabled || !config.stripe.configured) {
      return res.status(400).json({ message: 'Stripe is currently not configured' });
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append(
      'success_url',
      `${resolveClientBaseUrl(req)}/checkout?gateway=stripe&status=success&session_id={CHECKOUT_SESSION_ID}`
    );
    params.append('cancel_url', `${resolveClientBaseUrl(req)}/checkout?gateway=stripe&cancelled=1`);
    params.append('line_items[0][price_data][currency]', 'inr');
    params.append('line_items[0][price_data][product_data][name]', 'Order Payment');
    params.append('line_items[0][price_data][unit_amount]', String(amountPaise));
    params.append('line_items[0][quantity]', '1');
    params.append('payment_method_types[0]', 'card');
    if (req.user?.email) {
      params.append('customer_email', req.user.email);
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.stripe.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    const stripeData = await parseJsonSafely(stripeResponse);
    if (!stripeResponse.ok || !stripeData.url || !stripeData.id) {
      return res.status(502).json({ message: 'Failed to create Stripe checkout session' });
    }

    return res.json({
      gateway,
      flow: 'redirect',
      redirectUrl: stripeData.url,
      stripeSessionId: stripeData.id
    });
  }

  if (gateway === 'paypal') {
    if (!config.paypal.enabled || !config.paypal.configured) {
      return res.status(400).json({ message: 'PayPal is currently not configured' });
    }

    const paypalBase =
      config.paypal.environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64');

    const tokenResponse = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await parseJsonSafely(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(502).json({ message: 'Failed to connect with PayPal' });
    }

    const usdAmount = (Number(prepared.totalPrice || 0) / 83).toFixed(2);
    const paypalOrderResponse = await fetch(`${paypalBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: usdAmount
            }
          }
        ],
        application_context: {
          return_url: `${resolveClientBaseUrl(req)}/checkout?gateway=paypal&status=success`,
          cancel_url: `${resolveClientBaseUrl(req)}/checkout?gateway=paypal&cancelled=1`,
          shipping_preference: 'NO_SHIPPING'
        }
      })
    });
    const paypalOrderData = await parseJsonSafely(paypalOrderResponse);
    const approveLink = Array.isArray(paypalOrderData.links)
      ? paypalOrderData.links.find((entry) => entry.rel === 'approve')?.href
      : '';

    if (!paypalOrderResponse.ok || !approveLink || !paypalOrderData.id) {
      return res.status(502).json({ message: 'Failed to create PayPal order' });
    }

    return res.json({
      gateway,
      flow: 'redirect',
      redirectUrl: approveLink,
      paypalOrderId: paypalOrderData.id
    });
  }

  if (gateway === 'payu') {
    if (!config.payu.enabled || !config.payu.configured) {
      return res.status(400).json({ message: 'PayU is currently not configured' });
    }

    const payuBase = config.payu.environment === 'live' ? 'https://secure.payu.in' : 'https://test.payu.in';
    const txnid = `payu_${Date.now()}_${String(req.user._id).slice(-6)}`.slice(0, 30);
    const amount = Number(prepared.totalPrice).toFixed(2);
    const firstname = String(req.user?.name || 'Customer').trim().split(' ')[0];
    const email = String(req.user?.email || '').trim();
    const productinfo = 'Order Payment';
    const hash = crypto
      .createHash('sha512')
      .update(
        `${config.payu.merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${config.payu.merchantSalt}`
      )
      .digest('hex');

    return res.json({
      gateway,
      flow: 'form_post',
      actionUrl: `${payuBase}/_payment`,
      method: 'POST',
      fields: {
        key: config.payu.merchantKey,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        phone: '9999999999',
        surl: `${resolveApiBaseUrl(req)}/orders/payment/payu/callback?result=success`,
        furl: `${resolveApiBaseUrl(req)}/orders/payment/payu/callback?result=failure`,
        hash,
        service_provider: 'payu_paisa'
      }
    });
  }

  if (gateway === 'cashfree') {
    if (!config.cashfree.enabled || !config.cashfree.configured) {
      return res.status(400).json({ message: 'Cashfree is currently not configured' });
    }

    const cashfreeBase =
      config.cashfree.environment === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const cashfreeOrderId = `cf_${Date.now()}_${String(req.user._id).slice(-6)}`.slice(0, 40);
    const cashfreeResponse = await fetch(`${cashfreeBase}/orders`, {
      method: 'POST',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': config.cashfree.appId,
        'x-client-secret': config.cashfree.secretKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: cashfreeOrderId,
        order_amount: Number(prepared.totalPrice.toFixed(2)),
        order_currency: 'INR',
        customer_details: {
          customer_id: String(req.user._id),
          customer_name: String(req.user?.name || 'Customer'),
          customer_email: String(req.user?.email || 'customer@example.com'),
          customer_phone: '9999999999'
        },
        order_meta: {
          return_url: `${resolveClientBaseUrl(req)}/checkout?gateway=cashfree&status=success&order_id={order_id}`
        }
      })
    });
    const cashfreeData = await parseJsonSafely(cashfreeResponse);
    const redirectUrl =
      String(cashfreeData.payment_link || '').trim() ||
      (cashfreeData.payment_session_id ? `https://payments.cashfree.com/order/#${cashfreeData.payment_session_id}` : '');

    if (!cashfreeResponse.ok || !cashfreeData.order_id || !redirectUrl) {
      return res.status(502).json({ message: 'Failed to create Cashfree payment order' });
    }

    return res.json({
      gateway,
      flow: 'redirect',
      redirectUrl,
      cashfreeOrderId: cashfreeData.order_id
    });
  }

  if (gateway === 'phonepe') {
    if (!config.phonepe.enabled || !config.phonepe.configured) {
      return res.status(400).json({ message: 'PhonePe is currently not configured' });
    }

    const phonepeBase =
      config.phonepe.environment === 'production'
        ? 'https://api.phonepe.com/apis/hermes'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    const phonepeTransactionId = `php_${Date.now()}_${String(req.user._id).slice(-6)}`.slice(0, 35);
    const requestPayload = Buffer.from(
      JSON.stringify({
        merchantId: config.phonepe.merchantId,
        merchantTransactionId: phonepeTransactionId,
        merchantUserId: String(req.user._id),
        amount: amountPaise,
        redirectUrl: `${resolveClientBaseUrl(req)}/checkout?gateway=phonepe&status=success&transaction_id=${phonepeTransactionId}`,
        redirectMode: 'REDIRECT',
        callbackUrl: `${resolveApiBaseUrl(req)}/orders/payment/phonepe/callback`,
        mobileNumber: '9999999999',
        paymentInstrument: { type: 'PAY_PAGE' }
      })
    ).toString('base64');

    const payPath = '/pg/v1/pay';
    const checksum = `${crypto
      .createHash('sha256')
      .update(`${requestPayload}${payPath}${config.phonepe.saltKey}`)
      .digest('hex')}###${config.phonepe.saltIndex}`;

    const phonepeResponse = await fetch(`${phonepeBase}${payPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum
      },
      body: JSON.stringify({ request: requestPayload })
    });
    const phonepeData = await parseJsonSafely(phonepeResponse);
    const redirectUrl = phonepeData?.data?.instrumentResponse?.redirectInfo?.url;
    if (!phonepeResponse.ok || !redirectUrl) {
      return res.status(502).json({ message: 'Failed to create PhonePe payment session' });
    }

    return res.json({
      gateway,
      flow: 'redirect',
      redirectUrl,
      phonepeTransactionId
    });
  }

  return res.status(400).json({ message: `Unsupported payment gateway: ${gateway}` });
};

const verifyPaymentAndCreateOrder = async (req, res) => {
  const gateway = normalizeGatewayId(req.body?.gateway);
  const { items } = req.body;

  if (!gateway) {
    return res.status(400).json({ message: 'Payment gateway is required' });
  }
  let checkoutDetails;
  try {
    checkoutDetails = normalizeCheckoutDetails(req.body || {}, req.user || {});
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid checkout details' });
  }

  const prepared = await prepareOrderItems(items);
  if (prepared.error) {
    return res.status(prepared.error.status).json({ message: prepared.error.message });
  }
  const expectedAmountPaise = Math.round(prepared.totalPrice * 100);

  let config;
  try {
    config = await loadPaymentGatewayConfig();
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Unable to load payment gateway settings' });
  }

  if (gateway === 'razorpay') {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Payment verification fields are required' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid Razorpay signature' });
    }

    const existing = await Order.findOne({ 'paymentResult.razorpayPaymentId': razorpayPaymentId }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'This payment is already processed' });
    }

    const razorpayClient = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret
    });
    let payment;
    try {
      payment = await razorpayClient.payments.fetch(razorpayPaymentId);
    } catch {
      return res.status(400).json({ message: 'Unable to verify payment with Razorpay' });
    }
    if (!payment || payment.order_id !== razorpayOrderId) {
      return res.status(400).json({ message: 'Payment/order mismatch' });
    }
    if (!['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ message: 'Payment is not completed' });
    }
    if (Number(payment.amount) !== expectedAmountPaise) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.razorpay,
      status: 'paid',
      paidAt: new Date(),
      paymentResult: {
        gateway: 'razorpay',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      }
    });
    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }
    return res.status(201).json({ message: 'Payment verified and order placed', order: saved.order });
  }

  if (gateway === 'stripe') {
    const stripeSessionId = String(req.body?.stripeSessionId || req.body?.session_id || '').trim();
    if (!stripeSessionId) {
      return res.status(400).json({ message: 'Stripe session id is required' });
    }

    const existing = await Order.findOne({ 'paymentResult.stripeSessionId': stripeSessionId }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'This payment is already processed' });
    }

    const stripeResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(stripeSessionId)}`, {
      headers: { Authorization: `Bearer ${config.stripe.secretKey}` }
    });
    const stripeData = await parseJsonSafely(stripeResponse);
    if (!stripeResponse.ok || stripeData.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Unable to verify payment with Stripe' });
    }
    if (Number(stripeData.amount_total || 0) !== expectedAmountPaise) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.stripe,
      status: 'paid',
      paidAt: new Date(),
      paymentResult: {
        gateway: 'stripe',
        stripeSessionId,
        stripePaymentIntentId: String(stripeData.payment_intent || '')
      }
    });
    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }
    return res.status(201).json({ message: 'Payment verified and order placed', order: saved.order });
  }

  if (gateway === 'paypal') {
    const paypalOrderId = String(req.body?.paypalOrderId || req.body?.token || '').trim();
    if (!paypalOrderId) {
      return res.status(400).json({ message: 'PayPal order id is required' });
    }

    const existing = await Order.findOne({ 'paymentResult.paypalOrderId': paypalOrderId }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'This payment is already processed' });
    }

    const paypalBase =
      config.paypal.environment === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString('base64');
    const tokenResponse = await fetch(`${paypalBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await parseJsonSafely(tokenResponse);
    if (!tokenResponse.ok || !tokenData.access_token) {
      return res.status(502).json({ message: 'Failed to connect with PayPal' });
    }

    const captureResponse = await fetch(`${paypalBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    const captureData = await parseJsonSafely(captureResponse);
    const amountUsd = Number(captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || 0);
    const amountPaise = Math.round(amountUsd * 8300);

    if (!captureResponse.ok || String(captureData?.status || '').toUpperCase() !== 'COMPLETED') {
      return res.status(400).json({ message: 'Unable to verify payment with PayPal' });
    }
    if (amountPaise !== expectedAmountPaise) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.paypal,
      status: 'paid',
      paidAt: new Date(),
      paymentResult: {
        gateway: 'paypal',
        paypalOrderId,
        paypalCaptureId: String(captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || '')
      }
    });
    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }
    return res.status(201).json({ message: 'Payment verified and order placed', order: saved.order });
  }

  if (gateway === 'payu') {
    const payuTxnId = String(req.body?.payuTxnId || req.body?.txnid || '').trim();
    const payuPaymentId = String(req.body?.payuPaymentId || req.body?.mihpayid || '').trim();
    if (!payuTxnId) {
      return res.status(400).json({ message: 'PayU transaction id is required' });
    }

    const existing = await Order.findOne({ 'paymentResult.payuTxnId': payuTxnId }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'This payment is already processed' });
    }

    const command = 'verify_payment';
    const hash = crypto
      .createHash('sha512')
      .update(`${config.payu.merchantKey}|${command}|${payuTxnId}|${config.payu.merchantSalt}`)
      .digest('hex');
    const verifyUrl =
      config.payu.environment === 'live'
        ? 'https://info.payu.in/merchant/postservice?form=2'
        : 'https://test.payu.in/merchant/postservice?form=2';

    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        key: config.payu.merchantKey,
        command,
        var1: payuTxnId,
        hash
      }).toString()
    });
    const verifyData = await parseJsonSafely(verifyResponse);
    const tx = verifyData?.transaction_details?.[payuTxnId] || {};
    if (!verifyResponse.ok || String(tx.status || '').toLowerCase() !== 'success') {
      return res.status(400).json({ message: 'Unable to verify payment with PayU' });
    }
    if (Math.round(Number(tx.amt || tx.amount || 0) * 100) !== expectedAmountPaise) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.payu,
      status: 'paid',
      paidAt: new Date(),
      paymentResult: {
        gateway: 'payu',
        payuTxnId,
        payuPaymentId: String(tx.mihpayid || payuPaymentId || '')
      }
    });
    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }
    return res.status(201).json({ message: 'Payment verified and order placed', order: saved.order });
  }

  if (gateway === 'cashfree') {
    const cashfreeOrderId = String(req.body?.cashfreeOrderId || req.body?.order_id || '').trim();
    if (!cashfreeOrderId) {
      return res.status(400).json({ message: 'Cashfree order id is required' });
    }

    const existing = await Order.findOne({ 'paymentResult.cashfreeOrderId': cashfreeOrderId }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'This payment is already processed' });
    }

    const cashfreeBase =
      config.cashfree.environment === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const verifyResponse = await fetch(`${cashfreeBase}/orders/${encodeURIComponent(cashfreeOrderId)}/payments`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': config.cashfree.appId,
        'x-client-secret': config.cashfree.secretKey
      }
    });
    const verifyData = await parseJsonSafely(verifyResponse);
    const payments = Array.isArray(verifyData) ? verifyData : Array.isArray(verifyData?.data) ? verifyData.data : [];
    const successPayment = payments.find((entry) => ['SUCCESS', 'PAID'].includes(String(entry.payment_status || '').toUpperCase()));

    if (!verifyResponse.ok || !successPayment) {
      return res.status(400).json({ message: 'Unable to verify payment with Cashfree' });
    }
    if (Math.round(Number(successPayment.payment_amount || 0) * 100) !== expectedAmountPaise) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.cashfree,
      status: 'paid',
      paidAt: new Date(),
      paymentResult: {
        gateway: 'cashfree',
        cashfreeOrderId,
        cashfreePaymentId: String(successPayment.cf_payment_id || '')
      }
    });
    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }
    return res.status(201).json({ message: 'Payment verified and order placed', order: saved.order });
  }

  if (gateway === 'phonepe') {
    const phonepeTransactionId = String(req.body?.phonepeTransactionId || req.body?.transaction_id || '').trim();
    if (!phonepeTransactionId) {
      return res.status(400).json({ message: 'PhonePe transaction id is required' });
    }

    const existing = await Order.findOne({ 'paymentResult.phonepeTransactionId': phonepeTransactionId }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'This payment is already processed' });
    }

    const phonepeBase =
      config.phonepe.environment === 'production'
        ? 'https://api.phonepe.com/apis/hermes'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    const statusPath = `/pg/v1/status/${config.phonepe.merchantId}/${phonepeTransactionId}`;
    const checksum = `${crypto
      .createHash('sha256')
      .update(`${statusPath}${config.phonepe.saltKey}`)
      .digest('hex')}###${config.phonepe.saltIndex}`;

    const statusResponse = await fetch(`${phonepeBase}${statusPath}`, {
      headers: {
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': config.phonepe.merchantId
      }
    });
    const statusData = await parseJsonSafely(statusResponse);
    const isSuccess =
      String(statusData?.code || '').toUpperCase() === 'PAYMENT_SUCCESS' ||
      String(statusData?.data?.state || '').toUpperCase() === 'COMPLETED';

    if (!statusResponse.ok || !isSuccess) {
      return res.status(400).json({ message: 'Unable to verify payment with PhonePe' });
    }
    if (Number(statusData?.data?.amount || 0) !== expectedAmountPaise) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const saved = await createStoredOrder({
      userId: req.user._id,
      items,
      shippingAddress: checkoutDetails.shippingAddress,
      billingDetails: checkoutDetails.billingDetails,
      taxDetails: checkoutDetails.taxDetails,
      paymentMethod: PAYMENT_METHOD_LABELS.phonepe,
      status: 'paid',
      paidAt: new Date(),
      paymentResult: {
        gateway: 'phonepe',
        phonepeTransactionId,
        phonepeTransactionReference: String(statusData?.data?.transactionId || '')
      }
    });
    if (saved.error) {
      return res.status(saved.error.status).json({ message: saved.error.message });
    }
    return res.status(201).json({ message: 'Payment verified and order placed', order: saved.order });
  }

  return res.status(400).json({ message: `Unsupported payment gateway: ${gateway}` });
};

const payuCallbackRedirect = async (req, res) => {
  const clientBaseUrl = resolveClientBaseUrl(req);
  const status = String(req.query.result || req.body?.status || '').trim().toLowerCase() === 'success' ? 'success' : 'failure';
  const txnid = String(req.body?.txnid || '').trim();
  const mihpayid = String(req.body?.mihpayid || '').trim();

  const redirectUrl = new URL(`${clientBaseUrl}/checkout`);
  redirectUrl.searchParams.set('gateway', 'payu');
  redirectUrl.searchParams.set('status', status);
  if (txnid) {
    redirectUrl.searchParams.set('txnid', txnid);
  }
  if (mihpayid) {
    redirectUrl.searchParams.set('mihpayid', mihpayid);
  }

  return res.redirect(302, redirectUrl.toString());
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
  const fallbackProductIds = new Set();

  for (const order of orders) {
    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
    for (const item of orderItems) {
      const rawPurchasePrice = Number(item.purchasePrice);
      if ((Number.isNaN(rawPurchasePrice) || rawPurchasePrice <= 0) && item.product) {
        fallbackProductIds.add(String(item.product));
      }
    }
  }

  const fallbackProducts =
    fallbackProductIds.size > 0
      ? await Product.find({ _id: { $in: Array.from(fallbackProductIds) } }).select('purchasePrice variants')
      : [];
  const fallbackProductMap = new Map(fallbackProducts.map((product) => [String(product._id), product]));

  const resolveItemPurchasePrice = (item) => {
    const storedPurchasePrice = Number(item.purchasePrice);
    if (Number.isFinite(storedPurchasePrice) && storedPurchasePrice > 0) {
      return storedPurchasePrice;
    }
    if (item.purchasePrice === 0) {
      return 0;
    }

    const productId = String(item.product || '').trim();
    if (!productId) {
      return Number.isFinite(storedPurchasePrice) && storedPurchasePrice >= 0 ? storedPurchasePrice : 0;
    }

    const fallbackProduct = fallbackProductMap.get(productId);
    if (!fallbackProduct) {
      return Number.isFinite(storedPurchasePrice) && storedPurchasePrice >= 0 ? storedPurchasePrice : 0;
    }

    if (Array.isArray(fallbackProduct.variants) && fallbackProduct.variants.length > 0 && item.selectedSize) {
      const variantIndex = findVariantIndex(fallbackProduct, item.selectedSize, item.selectedColor);
      if (variantIndex >= 0) {
        const variantPurchasePrice = Number(fallbackProduct.variants[variantIndex]?.purchasePrice);
        if (Number.isFinite(variantPurchasePrice) && variantPurchasePrice >= 0) {
          return variantPurchasePrice;
        }
      }
    }

    const fallbackPurchasePrice = Number(fallbackProduct.purchasePrice);
    if (Number.isFinite(fallbackPurchasePrice) && fallbackPurchasePrice >= 0) {
      return fallbackPurchasePrice;
    }

    return Number.isFinite(storedPurchasePrice) && storedPurchasePrice >= 0 ? storedPurchasePrice : 0;
  };

  const statusBreakdownMap = new Map(
    ORDER_STATUSES.map((status) => [
      status,
      {
        status,
        count: 0,
        revenue: 0,
        cost: 0,
        profitLoss: 0
      }
    ])
  );
  const paymentBreakdownMap = new Map();
  const trendMap = new Map();
  const topProductsMap = new Map();

  let grossRevenue = 0;
  let grossCost = 0;
  let nonCancelledRevenue = 0;
  let nonCancelledCost = 0;
  let realizedRevenue = 0;
  let realizedCost = 0;
  let profitRevenue = 0;
  let lossRevenue = 0;
  let pipelineRevenue = 0;
  let pipelineCost = 0;
  let cancelledRevenue = 0;
  let cancelledCost = 0;
  let totalUnits = 0;
  let soldUnits = 0;
  let cancelledUnits = 0;

  for (const order of orders) {
    const orderStatus = ORDER_STATUSES.includes(order.status) ? order.status : 'pending';
    const orderTotal = Number(order.totalPrice || 0);
    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];
    const paymentMethod = normalizeQueryValue(order.paymentMethod) || 'Unknown';
    const isCancelled = orderStatus === 'cancelled';
    const isProfitStatus = PROFIT_STATUSES.includes(orderStatus);
    const isPipelineStatus = PIPELINE_STATUSES.includes(orderStatus);
    let orderCost = 0;
    let unitCount = 0;

    for (const item of orderItems) {
      const quantity = Number(item.quantity || 0);
      if (quantity <= 0) {
        continue;
      }

      const itemRevenue = Number(item.price || 0) * quantity;
      const itemPurchasePrice = resolveItemPurchasePrice(item);
      const itemCost = itemPurchasePrice * quantity;
      orderCost += itemCost;
      unitCount += quantity;

      const productId = String(item.product || '').trim();
      const productKey = productId || `name:${normalizeQueryValue(item.name).toLowerCase() || 'unknown'}`;

      if (!topProductsMap.has(productKey)) {
        topProductsMap.set(productKey, {
          productId,
          name: normalizeQueryValue(item.name) || 'Unnamed product',
          units: 0,
          revenue: 0,
          cost: 0,
          profitLoss: 0,
          cancelledUnits: 0,
          cancelledRevenue: 0,
          cancelledCost: 0
        });
      }

      const productEntry = topProductsMap.get(productKey);
      if (isCancelled) {
        productEntry.cancelledUnits += quantity;
        productEntry.cancelledRevenue += itemRevenue;
        productEntry.cancelledCost += itemCost;
      } else {
        productEntry.units += quantity;
        productEntry.revenue += itemRevenue;
        productEntry.cost += itemCost;
        productEntry.profitLoss += itemRevenue - itemCost;
      }
    }

    grossRevenue += orderTotal;
    grossCost += orderCost;

    if (isCancelled) {
      cancelledRevenue += orderTotal;
      cancelledCost += orderCost;
    } else {
      nonCancelledRevenue += orderTotal;
      nonCancelledCost += orderCost;
    }

    if (isProfitStatus) {
      const orderProfitLoss = orderTotal - orderCost;
      realizedRevenue += orderTotal;
      realizedCost += orderCost;
      if (orderProfitLoss >= 0) {
        profitRevenue += orderProfitLoss;
      } else {
        lossRevenue += Math.abs(orderProfitLoss);
      }
    }

    if (isPipelineStatus) {
      pipelineRevenue += orderTotal;
      pipelineCost += orderCost;
    }

    const statusEntry = statusBreakdownMap.get(orderStatus);
    statusEntry.count += 1;
    statusEntry.revenue += orderTotal;
    statusEntry.cost += orderCost;
    statusEntry.profitLoss += orderTotal - orderCost;

    if (!paymentBreakdownMap.has(paymentMethod)) {
      paymentBreakdownMap.set(paymentMethod, {
        paymentMethod,
        count: 0,
        revenue: 0,
        cost: 0,
        profitLoss: 0
      });
    }
    const paymentEntry = paymentBreakdownMap.get(paymentMethod);
    paymentEntry.count += 1;
    paymentEntry.revenue += orderTotal;
    paymentEntry.cost += orderCost;
    paymentEntry.profitLoss += orderTotal - orderCost;

    totalUnits += unitCount;
    if (isCancelled) {
      cancelledUnits += unitCount;
    } else {
      soldUnits += unitCount;
    }

    const bucket = getTrendBucket(order.createdAt, normalizedInterval);
    if (!trendMap.has(bucket.key)) {
      trendMap.set(bucket.key, {
        key: bucket.key,
        label: bucket.label,
        sortOrder: bucket.sortOrder,
        orders: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        loss: 0,
        pipelineRevenue: 0,
        pipelineCost: 0,
        cancelledRevenue: 0
      });
    }

    const trendEntry = trendMap.get(bucket.key);
    trendEntry.orders += 1;
    trendEntry.revenue += orderTotal;
    trendEntry.cost += orderCost;
    if (isProfitStatus) {
      const orderProfitLoss = orderTotal - orderCost;
      if (orderProfitLoss >= 0) {
        trendEntry.profit += orderProfitLoss;
      } else {
        trendEntry.loss += Math.abs(orderProfitLoss);
      }
    }
    if (isCancelled) {
      trendEntry.cancelledRevenue += orderTotal;
    }
    if (isPipelineStatus) {
      trendEntry.pipelineRevenue += orderTotal;
      trendEntry.pipelineCost += orderCost;
    }
  }

  const totalOrders = orders.length;
  const cancelledCount = statusBreakdownMap.get('cancelled')?.count || 0;
  const netRevenue = nonCancelledRevenue;
  const netProfitLoss = realizedRevenue - realizedCost;
  const pipelineProfitLoss = pipelineRevenue - pipelineCost;
  const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

  const statusBreakdown = Array.from(statusBreakdownMap.values()).map((entry) => ({
    ...entry,
    revenue: roundCurrency(entry.revenue),
    cost: roundCurrency(entry.cost),
    profitLoss: roundCurrency(entry.profitLoss)
  }));

  const paymentBreakdown = Array.from(paymentBreakdownMap.values())
    .map((entry) => ({
      ...entry,
      revenue: roundCurrency(entry.revenue),
      cost: roundCurrency(entry.cost),
      profitLoss: roundCurrency(entry.profitLoss)
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const trend = Array.from(trendMap.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      orders: entry.orders,
      revenue: roundCurrency(entry.revenue),
      cost: roundCurrency(entry.cost),
      profit: roundCurrency(entry.profit),
      loss: roundCurrency(entry.loss),
      pipelineRevenue: roundCurrency(entry.pipelineRevenue),
      pipelineCost: roundCurrency(entry.pipelineCost),
      pipelineProfitLoss: roundCurrency(entry.pipelineRevenue - entry.pipelineCost),
      cancelledRevenue: roundCurrency(entry.cancelledRevenue),
      netProfitLoss: roundCurrency(entry.profit - entry.loss)
    }));

  const topProducts = Array.from(topProductsMap.values())
    .map((entry) => ({
      ...entry,
      revenue: roundCurrency(entry.revenue),
      cost: roundCurrency(entry.cost),
      profitLoss: roundCurrency(entry.profitLoss),
      cancelledRevenue: roundCurrency(entry.cancelledRevenue),
      cancelledCost: roundCurrency(entry.cancelledCost)
    }))
    .sort((a, b) => {
      if (b.profitLoss !== a.profitLoss) {
        return b.profitLoss - a.profitLoss;
      }
      return b.revenue - a.revenue;
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
      grossCost: roundCurrency(grossCost),
      realizedRevenue: roundCurrency(realizedRevenue),
      realizedCost: roundCurrency(realizedCost),
      profitRevenue: roundCurrency(profitRevenue),
      lossRevenue: roundCurrency(lossRevenue),
      netRevenue: roundCurrency(netRevenue),
      netProfitLoss: roundCurrency(netProfitLoss),
      pipelineRevenue: roundCurrency(pipelineRevenue),
      pipelineCost: roundCurrency(pipelineCost),
      pipelineProfitLoss: roundCurrency(pipelineProfitLoss),
      cancelledRevenue: roundCurrency(cancelledRevenue),
      cancelledCost: roundCurrency(cancelledCost),
      nonCancelledCost: roundCurrency(nonCancelledCost),
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
  getPaymentGatewayOptions,
  createPaymentIntent,
  verifyPaymentAndCreateOrder,
  payuCallbackRedirect,
  getMyOrders,
  getMyOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderReports
};
