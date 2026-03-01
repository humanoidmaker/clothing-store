const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const StoreSettings = require('../models/StoreSettings');
const { decryptSettingValue } = require('../utils/secureSettings');

const signToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
const SETTINGS_SINGLETON_QUERY = { singletonKey: 'default' };
const LOGIN_MAX_FAILED_ATTEMPTS = 3;
const LOGIN_LOCK_DURATION_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const defaultAuthSecuritySettings = StoreSettings.defaultAuthSecuritySettings || {
  sendLoginAlertEmail: false,
  recaptcha: {
    enabled: false,
    siteKey: '',
    secretKeyEncrypted: ''
  },
  smtp: {
    enabled: false,
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    username: '',
    passwordEncrypted: '',
    fromEmail: '',
    fromName: 'Humanoid Maker'
  }
};

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

const extractSmtpConfig = (source = {}) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }

  const direct = source.smtp;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return direct;
  }

  const detected = Object.entries(source).find(([key, value]) => {
    if (['sendLoginAlertEmail', 'recaptcha', 'smtp'].includes(key)) {
      return false;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    return (
      Object.prototype.hasOwnProperty.call(value, 'host') ||
      Object.prototype.hasOwnProperty.call(value, 'port') ||
      Object.prototype.hasOwnProperty.call(value, 'username') ||
      Object.prototype.hasOwnProperty.call(value, 'passwordEncrypted') ||
      Object.prototype.hasOwnProperty.call(value, 'fromEmail') ||
      Object.prototype.hasOwnProperty.call(value, 'fromName')
    );
  });

  return detected?.[1] || {};
};

const normalizeAuthSecurityConfig = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const smtpSource = extractSmtpConfig(source);
  return {
    sendLoginAlertEmail:
      typeof source?.sendLoginAlertEmail === 'boolean'
        ? source.sendLoginAlertEmail
        : defaultAuthSecuritySettings.sendLoginAlertEmail,
    recaptcha: {
      enabled:
        typeof source?.recaptcha?.enabled === 'boolean'
          ? source.recaptcha.enabled
          : defaultAuthSecuritySettings.recaptcha.enabled,
      siteKey: String(source?.recaptcha?.siteKey || '').trim(),
      secretKeyEncrypted: String(source?.recaptcha?.secretKeyEncrypted || '').trim()
    },
    smtp: {
      enabled:
        typeof smtpSource?.enabled === 'boolean'
          ? smtpSource.enabled
          : defaultAuthSecuritySettings.smtp.enabled,
      host: String(smtpSource?.host || defaultAuthSecuritySettings.smtp.host).trim(),
      port: Number(smtpSource?.port || defaultAuthSecuritySettings.smtp.port),
      secure:
        typeof smtpSource?.secure === 'boolean'
          ? smtpSource.secure
          : defaultAuthSecuritySettings.smtp.secure,
      username: String(smtpSource?.username || '').trim(),
      passwordEncrypted: String(smtpSource?.passwordEncrypted || '').trim(),
      fromEmail: String(smtpSource?.fromEmail || '').trim().toLowerCase(),
      fromName:
        String(smtpSource?.fromName || defaultAuthSecuritySettings.smtp.fromName).trim() ||
        defaultAuthSecuritySettings.smtp.fromName
    }
  };
};

const getAuthSecurityConfig = async () => {
  const settings = await StoreSettings.findOne(SETTINGS_SINGLETON_QUERY).select('authSecurity');
  return normalizeAuthSecurityConfig(settings?.authSecurity || {});
};

const decryptSecret = (value) => {
  const encrypted = String(value || '').trim();
  if (!encrypted) {
    return '';
  }
  try {
    return decryptSettingValue(encrypted);
  } catch {
    return '';
  }
};

const resolveClientBaseUrl = (req) => {
  const explicit = String(process.env.CLIENT_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  return `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
};

const verifyRecaptchaIfNeeded = async (token, authSecurity) => {
  const recaptchaConfig = authSecurity?.recaptcha || {};
  if (!recaptchaConfig.enabled) {
    return;
  }

  const secret = decryptSecret(recaptchaConfig.secretKeyEncrypted);
  if (!recaptchaConfig.siteKey || !secret) {
    throw new Error('reCAPTCHA is enabled but not configured in admin settings');
  }
  const normalizedToken = trimOrEmpty(token);
  if (!normalizedToken) {
    throw new Error('reCAPTCHA verification is required');
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', normalizedToken);

  let response;
  try {
    response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
  } catch {
    throw new Error('Unable to verify reCAPTCHA at this time');
  }

  if (!response.ok) {
    throw new Error('Unable to verify reCAPTCHA at this time');
  }

  let parsed = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!parsed?.success) {
    throw new Error('reCAPTCHA verification failed');
  }
};

const sendSmtpEmail = async (authSecurity, { to, subject, text, html }) => {
  const smtp = authSecurity?.smtp || {};
  if (!smtp.enabled) {
    return { skipped: true, reason: 'SMTP disabled' };
  }

  const password = decryptSecret(smtp.passwordEncrypted);
  const host = trimOrEmpty(smtp.host);
  const username = trimOrEmpty(smtp.username);
  const fromEmail = trimOrEmpty(smtp.fromEmail).toLowerCase();
  const fromName = trimOrEmpty(smtp.fromName) || 'Humanoid Maker';

  if (!host || !username || !password || !fromEmail) {
    throw new Error('SMTP settings are incomplete in admin settings');
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(smtp.port || 587),
    secure: Boolean(smtp.secure),
    auth: {
      user: username,
      pass: password
    }
  });

  await transport.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject,
    text,
    html
  });

  return { skipped: false };
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
  const { name, email, password, recaptchaToken } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }

  let authSecurity;
  try {
    authSecurity = await getAuthSecurityConfig();
    await verifyRecaptchaIfNeeded(recaptchaToken, authSecurity);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'reCAPTCHA verification failed' });
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

  if (authSecurity?.smtp?.enabled) {
    const safeName = trimOrEmpty(name) || 'there';
    const storeLabel = trimOrEmpty(process.env.STORE_NAME || 'Humanoid Maker');
    const subject = `Welcome to ${storeLabel}`;
    const text = `Hi ${safeName}, your account was created successfully.`;
    const html = `<p>Hi ${safeName},</p><p>Your account was created successfully.</p>`;
    try {
      await sendSmtpEmail(authSecurity, { to: normalizedEmail, subject, text, html });
    } catch {
      // Registration should not fail when notification email fails.
    }
  }

  return res.status(201).json(buildAuthResponse(user));
};

const loginUser = async (req, res) => {
  const { email, password, recaptchaToken } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  let authSecurity;
  try {
    authSecurity = await getAuthSecurityConfig();
    await verifyRecaptchaIfNeeded(recaptchaToken, authSecurity);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'reCAPTCHA verification failed' });
  }

  const normalizedEmail = trimOrEmpty(email).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const now = Date.now();
  const lockUntilTimestamp = user.lockUntil ? new Date(user.lockUntil).getTime() : 0;
  if (lockUntilTimestamp && lockUntilTimestamp > now) {
    const remainingSeconds = Math.max(1, Math.ceil((lockUntilTimestamp - now) / 1000));
    return res.status(423).json({
      message: `Account temporarily locked. Try again in ${remainingSeconds} seconds.`
    });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const nextFailedAttempts = Number(user.failedLoginAttempts || 0) + 1;
    if (nextFailedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS) {
      user.failedLoginAttempts = 0;
      user.lockUntil = new Date(now + LOGIN_LOCK_DURATION_MS);
      await user.save();
      return res.status(423).json({
        message: 'Too many incorrect password attempts. Account locked for 5 minutes.'
      });
    }

    user.failedLoginAttempts = nextFailedAttempts;
    user.lockUntil = null;
    await user.save();
    const remainingAttempts = LOGIN_MAX_FAILED_ATTEMPTS - nextFailedAttempts;
    return res.status(401).json({
      message: `Invalid credentials. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} left before temporary lock.`
    });
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  if (authSecurity.sendLoginAlertEmail && authSecurity?.smtp?.enabled) {
    const subject = 'New login detected';
    const text = `Hi ${user.name}, your account was just logged in at ${new Date().toISOString()}.`;
    const html = `<p>Hi ${user.name},</p><p>Your account was just logged in at ${new Date().toISOString()}.</p>`;
    try {
      await sendSmtpEmail(authSecurity, { to: user.email, subject, text, html });
    } catch {
      // Login should not fail if notification email fails.
    }
  }

  return res.json(buildAuthResponse(user));
};

const getCurrentUser = async (req, res) => {
  return res.json(buildUserResponse(req.user));
};

const forgotPassword = async (req, res) => {
  const email = trimOrEmpty(req.body?.email || '').toLowerCase();
  const recaptchaToken = req.body?.recaptchaToken;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }

  let authSecurity;
  try {
    authSecurity = await getAuthSecurityConfig();
    await verifyRecaptchaIfNeeded(recaptchaToken, authSecurity);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'reCAPTCHA verification failed' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({
      message: 'If an account exists with this email, password reset instructions have been sent.'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const clientBaseUrl = resolveClientBaseUrl(req);
  const resetUrl = `${clientBaseUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`;
  const subject = 'Reset your password';
  const text = `Hi ${user.name}, reset your password using this link: ${resetUrl}`;
  const html = `<p>Hi ${user.name},</p><p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 15 minutes.</p>`;

  try {
    await sendSmtpEmail(authSecurity, { to: user.email, subject, text, html });
  } catch (error) {
    return res.status(503).json({ message: error.message || 'Unable to send reset email right now' });
  }

  return res.json({
    message: 'If an account exists with this email, password reset instructions have been sent.'
  });
};

const resetPassword = async (req, res) => {
  const email = trimOrEmpty(req.body?.email || '').toLowerCase();
  const token = trimOrEmpty(req.body?.token || '');
  const newPassword = String(req.body?.newPassword || '');
  const recaptchaToken = req.body?.recaptchaToken;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: 'Email, token and new password are required' });
  }
  if (!emailPattern.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  let authSecurity;
  try {
    authSecurity = await getAuthSecurityConfig();
    await verifyRecaptchaIfNeeded(recaptchaToken, authSecurity);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'reCAPTCHA verification failed' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email,
    passwordResetTokenHash: tokenHash
  });

  if (!user || !user.passwordResetExpiresAt || new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
    return res.status(400).json({ message: 'Reset token is invalid or expired' });
  }

  user.password = newPassword;
  user.passwordResetTokenHash = '';
  user.passwordResetExpiresAt = null;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  return res.json({ message: 'Password has been reset successfully. Please login.' });
};

const getAdminUsers = async (req, res) => {
  const query = trimOrEmpty(req.query?.query || '');
  const limitRaw = Number(req.query?.limit || 50);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.round(limitRaw), 200) : 50;

  const filters = {};
  if (query) {
    const regex = { $regex: query, $options: 'i' };
    filters.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const users = await User.find(filters)
    .select(
      'name email phone isAdmin createdAt defaultShippingAddress defaultBillingDetails defaultTaxDetails'
    )
    .sort({ createdAt: -1 })
    .limit(limit);

  const normalized = users.map((user) => buildUserResponse(user));
  return res.json({ users: normalized, total: normalized.length });
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
  forgotPassword,
  resetPassword,
  getAdminUsers,
  updateCurrentUser
};
