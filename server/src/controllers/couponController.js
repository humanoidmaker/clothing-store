const Coupon = require('../models/Coupon');
const { getResellerSettingsById } = require('../utils/resellerStore');

const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;
const DISCOUNT_TYPES = ['percentage', 'flat'];

const trimText = (value) => String(value || '').trim();
const normalizeCouponCode = (value) => trimText(value).toUpperCase();
const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const parseOptionalDate = (value, label) => {
  if (value === undefined || value === null || trimText(value) === '') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is invalid`);
  }
  return parsed;
};

const buildCouponStatus = (coupon, now = new Date()) => {
  if (!coupon?.active) {
    return 'inactive';
  }

  if (coupon?.startsAt && new Date(coupon.startsAt) > now) {
    return 'scheduled';
  }
  if (coupon?.expiresAt && new Date(coupon.expiresAt) < now) {
    return 'expired';
  }

  return 'active';
};

const formatCoupon = (couponDoc, now = new Date()) => {
  const coupon = couponDoc && typeof couponDoc.toObject === 'function' ? couponDoc.toObject() : couponDoc;
  return {
    _id: String(coupon?._id || ''),
    code: normalizeCouponCode(coupon?.code || ''),
    description: trimText(coupon?.description || ''),
    discountType: trimText(coupon?.discountType || 'percentage') || 'percentage',
    discountValue: roundCurrency(coupon?.discountValue || 0),
    minOrderAmount: roundCurrency(coupon?.minOrderAmount || 0),
    maxDiscountAmount: roundCurrency(coupon?.maxDiscountAmount || 0),
    startsAt: coupon?.startsAt || null,
    expiresAt: coupon?.expiresAt || null,
    active: Boolean(coupon?.active),
    status: buildCouponStatus(coupon, now),
    resellerId: trimText(coupon?.resellerId || ''),
    resellerName: trimText(coupon?.resellerName || ''),
    resellerDomain: trimText(coupon?.resellerDomain || ''),
    createdAt: coupon?.createdAt || null,
    updatedAt: coupon?.updatedAt || null
  };
};

const getAccessScope = async (user = {}) => {
  const isMainAdmin = Boolean(user?.isAdmin);
  const resellerId = trimText(user?.resellerId || '');
  const isResellerAdmin = !isMainAdmin && Boolean(user?.isResellerAdmin) && Boolean(resellerId);

  if (!isMainAdmin && !isResellerAdmin) {
    return { error: { status: 403, message: 'Admin or reseller access required' } };
  }

  if (isMainAdmin) {
    return {
      isMainAdmin: true,
      isResellerAdmin: false,
      resellerId: '',
      query: {}
    };
  }

  const resellerRecord = await getResellerSettingsById(resellerId);
  if (!resellerRecord?.reseller) {
    return { error: { status: 404, message: 'Reseller profile not found' } };
  }

  return {
    isMainAdmin: false,
    isResellerAdmin: true,
    resellerId,
    resellerName: trimText(resellerRecord.reseller.websiteName || resellerRecord.reseller.name || ''),
    resellerDomain: trimText(resellerRecord.reseller.primaryDomain || ''),
    query: { resellerId }
  };
};

const validateCouponPayload = (payload = {}, { partial = false } = {}) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const normalized = {};

  const hasCode = Object.prototype.hasOwnProperty.call(source, 'code');
  if (hasCode || !partial) {
    const code = normalizeCouponCode(source.code || '');
    if (!code) {
      throw new Error('Coupon code is required');
    }
    if (!COUPON_CODE_PATTERN.test(code)) {
      throw new Error('Coupon code must be 3-40 characters (A-Z, 0-9, underscore, hyphen)');
    }
    normalized.code = code;
  }

  const hasDescription = Object.prototype.hasOwnProperty.call(source, 'description');
  if (hasDescription || !partial) {
    normalized.description = trimText(source.description || '');
    if (normalized.description.length > 200) {
      throw new Error('Description must be 200 characters or less');
    }
  }

  const hasDiscountType = Object.prototype.hasOwnProperty.call(source, 'discountType');
  if (hasDiscountType || !partial) {
    const discountType = trimText(source.discountType || 'percentage').toLowerCase();
    if (!DISCOUNT_TYPES.includes(discountType)) {
      throw new Error(`discountType must be one of: ${DISCOUNT_TYPES.join(', ')}`);
    }
    normalized.discountType = discountType;
  }

  const hasDiscountValue = Object.prototype.hasOwnProperty.call(source, 'discountValue');
  if (hasDiscountValue || !partial) {
    const discountValue = Number(source.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new Error('discountValue must be greater than 0');
    }
    normalized.discountValue = roundCurrency(discountValue);
  }

  const hasMinOrderAmount = Object.prototype.hasOwnProperty.call(source, 'minOrderAmount');
  if (hasMinOrderAmount || !partial) {
    const minOrderAmount = Number(source.minOrderAmount || 0);
    if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
      throw new Error('minOrderAmount cannot be negative');
    }
    normalized.minOrderAmount = roundCurrency(minOrderAmount);
  }

  const hasMaxDiscountAmount = Object.prototype.hasOwnProperty.call(source, 'maxDiscountAmount');
  if (hasMaxDiscountAmount || !partial) {
    const maxDiscountAmount = Number(source.maxDiscountAmount || 0);
    if (!Number.isFinite(maxDiscountAmount) || maxDiscountAmount < 0) {
      throw new Error('maxDiscountAmount cannot be negative');
    }
    normalized.maxDiscountAmount = roundCurrency(maxDiscountAmount);
  }

  const hasActive = Object.prototype.hasOwnProperty.call(source, 'active');
  if (hasActive) {
    normalized.active = Boolean(source.active);
  } else if (!partial) {
    normalized.active = true;
  }

  const hasStartsAt = Object.prototype.hasOwnProperty.call(source, 'startsAt');
  if (hasStartsAt || !partial) {
    normalized.startsAt = parseOptionalDate(source.startsAt, 'startsAt');
  }

  const hasExpiresAt = Object.prototype.hasOwnProperty.call(source, 'expiresAt');
  if (hasExpiresAt || !partial) {
    normalized.expiresAt = parseOptionalDate(source.expiresAt, 'expiresAt');
  }

  const startsAt = Object.prototype.hasOwnProperty.call(normalized, 'startsAt') ? normalized.startsAt : null;
  const expiresAt = Object.prototype.hasOwnProperty.call(normalized, 'expiresAt') ? normalized.expiresAt : null;
  if (startsAt && expiresAt && startsAt > expiresAt) {
    throw new Error('expiresAt cannot be earlier than startsAt');
  }

  const effectiveType = normalized.discountType || trimText(source.discountType || '').toLowerCase();
  const effectiveValue = Number(
    Object.prototype.hasOwnProperty.call(normalized, 'discountValue') ? normalized.discountValue : source.discountValue
  );
  if (effectiveType === 'percentage' && Number.isFinite(effectiveValue) && effectiveValue > 100) {
    throw new Error('Percentage discount cannot exceed 100');
  }

  return normalized;
};

const listCoupons = async (req, res) => {
  const scope = await getAccessScope(req.user || {});
  if (scope.error) {
    return res.status(scope.error.status).json({ message: scope.error.message });
  }

  const coupons = await Coupon.find(scope.query).sort({ createdAt: -1 });
  const now = new Date();
  return res.json({
    coupons: coupons.map((coupon) => formatCoupon(coupon, now))
  });
};

const createCoupon = async (req, res) => {
  const scope = await getAccessScope(req.user || {});
  if (scope.error) {
    return res.status(scope.error.status).json({ message: scope.error.message });
  }

  let payload;
  try {
    payload = validateCouponPayload(req.body || {}, { partial: false });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid coupon payload' });
  }

  try {
    const created = await Coupon.create({
      ...payload,
      resellerId: scope.isResellerAdmin ? scope.resellerId : '',
      resellerName: scope.isResellerAdmin ? scope.resellerName || '' : '',
      resellerDomain: scope.isResellerAdmin ? scope.resellerDomain || '' : '',
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    return res.status(201).json({
      message: 'Coupon created successfully',
      coupon: formatCoupon(created)
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Coupon code already exists in this dashboard scope' });
    }
    return res.status(400).json({ message: error.message || 'Failed to create coupon' });
  }
};

const updateCoupon = async (req, res) => {
  const scope = await getAccessScope(req.user || {});
  if (scope.error) {
    return res.status(scope.error.status).json({ message: scope.error.message });
  }

  let payload;
  try {
    payload = validateCouponPayload(req.body || {}, { partial: true });
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Invalid coupon payload' });
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: 'No coupon fields were provided' });
  }

  const query = {
    _id: req.params.id,
    ...scope.query
  };
  const coupon = await Coupon.findOne(query);
  if (!coupon) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  Object.assign(coupon, payload, {
    updatedBy: req.user?._id || null
  });

  if (coupon.startsAt && coupon.expiresAt && new Date(coupon.startsAt) > new Date(coupon.expiresAt)) {
    return res.status(400).json({ message: 'expiresAt cannot be earlier than startsAt' });
  }
  if (String(coupon.discountType || '').toLowerCase() === 'percentage' && Number(coupon.discountValue || 0) > 100) {
    return res.status(400).json({ message: 'Percentage discount cannot exceed 100' });
  }

  try {
    await coupon.save();
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Coupon code already exists in this dashboard scope' });
    }
    return res.status(400).json({ message: error.message || 'Failed to update coupon' });
  }

  return res.json({
    message: 'Coupon updated successfully',
    coupon: formatCoupon(coupon)
  });
};

const deleteCoupon = async (req, res) => {
  const scope = await getAccessScope(req.user || {});
  if (scope.error) {
    return res.status(scope.error.status).json({ message: scope.error.message });
  }

  const deleted = await Coupon.findOneAndDelete({
    _id: req.params.id,
    ...scope.query
  });
  if (!deleted) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  return res.json({ message: 'Coupon deleted successfully' });
};

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
};
