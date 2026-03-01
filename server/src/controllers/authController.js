const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimOrEmpty = (value) => String(value || '').trim();

const trimWithLimit = (value, label, max) => {
  const normalized = trimOrEmpty(value);
  if (normalized.length > max) {
    throw new Error(`${label} must be ${max} characters or less`);
  }
  return normalized;
};

const ensureObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value;
};

const normalizeAddress = (value = {}, fallback = {}) => ({
  fullName: trimWithLimit(value.fullName ?? fallback.fullName ?? '', 'Full name', 120),
  phone: trimWithLimit(value.phone ?? fallback.phone ?? '', 'Phone', 30),
  email: trimWithLimit(value.email ?? fallback.email ?? '', 'Email', 180).toLowerCase(),
  street: trimWithLimit(value.street ?? fallback.street ?? '', 'Street', 220),
  addressLine2: trimWithLimit(value.addressLine2 ?? fallback.addressLine2 ?? '', 'Address line 2', 220),
  city: trimWithLimit(value.city ?? fallback.city ?? '', 'City', 120),
  state: trimWithLimit(value.state ?? fallback.state ?? '', 'State', 120),
  postalCode: trimWithLimit(value.postalCode ?? fallback.postalCode ?? '', 'Postal code', 30),
  country: trimWithLimit(value.country ?? fallback.country ?? 'India', 'Country', 120) || 'India'
});

const normalizeBillingDetails = (value = {}, shippingAddress = {}) => {
  const sameAsShipping = value?.sameAsShipping !== false;
  if (sameAsShipping) {
    return {
      sameAsShipping: true,
      ...normalizeAddress(shippingAddress, shippingAddress)
    };
  }

  return {
    sameAsShipping: false,
    ...normalizeAddress(value, {
      email: shippingAddress.email,
      country: shippingAddress.country || 'India'
    })
  };
};

const normalizeTaxDetails = (value = {}) => {
  const businessPurchase = Boolean(value?.businessPurchase);
  const tax = {
    businessPurchase,
    businessName: trimWithLimit(value.businessName ?? '', 'Business name', 160),
    gstin: trimWithLimit(value.gstin ?? '', 'GSTIN', 30).toUpperCase(),
    pan: trimWithLimit(value.pan ?? '', 'PAN', 20).toUpperCase(),
    purchaseOrderNumber: trimWithLimit(value.purchaseOrderNumber ?? '', 'PO number', 80),
    notes: trimWithLimit(value.notes ?? '', 'Notes', 500)
  };

  if (businessPurchase && !tax.gstin) {
    throw new Error('GSTIN is required when business purchase is enabled');
  }

  return tax;
};

const buildUserResponse = (user) => {
  const shippingAddress = normalizeAddress(user.defaultShippingAddress || {}, {
    fullName: user.name,
    email: user.email,
    country: 'India'
  });
  const billingDetails = normalizeBillingDetails(user.defaultBillingDetails || {}, shippingAddress);

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: trimOrEmpty(user.phone || ''),
    isAdmin: Boolean(user.isAdmin),
    defaultShippingAddress: shippingAddress,
    defaultBillingDetails: billingDetails,
    defaultTaxDetails: normalizeTaxDetails(user.defaultTaxDetails || {})
  };
};

const buildAuthResponse = (user) => ({
  ...buildUserResponse(user),
  token: signToken(user._id)
});

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  const normalizedEmail = trimOrEmpty(email).toLowerCase();
  if (!emailPattern.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: 'Email already in use' });
  }

  const user = await User.create({ name: trimOrEmpty(name), email: normalizedEmail, password });
  return res.status(201).json(buildAuthResponse(user));
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = trimOrEmpty(email).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  return res.json(buildAuthResponse(user));
};

const getCurrentUser = async (req, res) => {
  return res.json(buildUserResponse(req.user));
};

const updateCurrentUser = async (req, res) => {
  const accountPayload =
    req.body?.account && typeof req.body.account === 'object' && !Array.isArray(req.body.account)
      ? req.body.account
      : req.body || {};
  const defaultsPayload =
    req.body?.defaults && typeof req.body.defaults === 'object' && !Array.isArray(req.body.defaults)
      ? req.body.defaults
      : req.body || {};

  const hasName = Object.prototype.hasOwnProperty.call(accountPayload, 'name');
  const hasEmail = Object.prototype.hasOwnProperty.call(accountPayload, 'email');
  const hasPhone = Object.prototype.hasOwnProperty.call(accountPayload, 'phone');
  const hasCurrentPassword = Object.prototype.hasOwnProperty.call(accountPayload, 'currentPassword');
  const hasNewPassword = Object.prototype.hasOwnProperty.call(accountPayload, 'newPassword');
  const hasDefaultShipping = Object.prototype.hasOwnProperty.call(defaultsPayload, 'defaultShippingAddress');
  const hasDefaultBilling = Object.prototype.hasOwnProperty.call(defaultsPayload, 'defaultBillingDetails');
  const hasDefaultTax = Object.prototype.hasOwnProperty.call(defaultsPayload, 'defaultTaxDetails');

  if (
    !hasName &&
    !hasEmail &&
    !hasPhone &&
    !hasCurrentPassword &&
    !hasNewPassword &&
    !hasDefaultShipping &&
    !hasDefaultBilling &&
    !hasDefaultTax
  ) {
    return res.status(400).json({ message: 'No profile fields were provided' });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const previousEmail = String(user.email || '').trim().toLowerCase();

  if (hasName) {
    const nextName = trimWithLimit(accountPayload.name, 'Name', 120);
    if (!nextName) {
      return res.status(400).json({ message: 'Name is required' });
    }
    user.name = nextName;
  }

  if (hasEmail) {
    const nextEmail = trimWithLimit(accountPayload.email, 'Email', 180).toLowerCase();
    if (!nextEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!emailPattern.test(nextEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (nextEmail !== user.email) {
      const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } }).select('_id');
      if (existing) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      user.email = nextEmail;
    }
  }

  if (hasPhone) {
    user.phone = trimWithLimit(accountPayload.phone, 'Phone', 30);
  }

  if (hasCurrentPassword !== hasNewPassword) {
    return res.status(400).json({ message: 'Current password and new password are required together' });
  }
  if (hasCurrentPassword && hasNewPassword) {
    const currentPassword = String(accountPayload.currentPassword || '');
    const newPassword = String(accountPayload.newPassword || '');

    if (!currentPassword) {
      return res.status(400).json({ message: 'Current password is required' });
    }
    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    const passwordMatches = await user.comparePassword(currentPassword);
    if (!passwordMatches) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
  }

  const mergedShippingAddress = normalizeAddress(
    hasDefaultShipping
      ? {
          ...normalizeAddress(user.defaultShippingAddress || {}, {
            fullName: user.name,
            email: user.email,
            country: 'India'
          }),
          ...ensureObject(defaultsPayload.defaultShippingAddress, 'Default shipping address')
        }
      : user.defaultShippingAddress || {},
    {
      fullName: user.name,
      email: user.email,
      country: 'India'
    }
  );
  const shouldSyncShippingEmail = hasEmail && (!mergedShippingAddress.email || mergedShippingAddress.email === previousEmail);
  if (shouldSyncShippingEmail) {
    mergedShippingAddress.email = user.email;
  }
  if (hasDefaultShipping || shouldSyncShippingEmail) {
    user.defaultShippingAddress = mergedShippingAddress;
  }

  const mergedBillingDetails = normalizeBillingDetails(
    hasDefaultBilling
      ? {
          ...normalizeBillingDetails(user.defaultBillingDetails || {}, mergedShippingAddress),
          ...ensureObject(defaultsPayload.defaultBillingDetails, 'Default billing details')
        }
      : user.defaultBillingDetails || {},
    mergedShippingAddress
  );
  const shouldSyncBillingEmail =
    hasEmail &&
    !mergedBillingDetails.sameAsShipping &&
    (!mergedBillingDetails.email || mergedBillingDetails.email === previousEmail);
  if (shouldSyncBillingEmail) {
    mergedBillingDetails.email = user.email;
  }
  if (hasDefaultBilling || shouldSyncBillingEmail) {
    user.defaultBillingDetails = mergedBillingDetails;
  } else if (mergedBillingDetails.sameAsShipping) {
    user.defaultBillingDetails = mergedBillingDetails;
  }

  if (hasDefaultTax) {
    user.defaultTaxDetails = normalizeTaxDetails({
      ...normalizeTaxDetails(user.defaultTaxDetails || {}),
      ...ensureObject(defaultsPayload.defaultTaxDetails, 'Default tax details')
    });
  }

  await user.save();
  return res.json(buildUserResponse(user));
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser
};
