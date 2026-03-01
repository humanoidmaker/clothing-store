const crypto = require('crypto');
const {
  listResellers,
  createReseller,
  updateReseller,
  deleteReseller,
  setResellerDefaultMargin,
  setResellerProductMargins,
  getResellerById
} = require('../utils/resellerStore');
const User = require('../models/User');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const trimOrEmpty = (value) => String(value || '').trim();

const generateResellerPassword = () => `Rslr@${crypto.randomBytes(6).toString('base64url')}`;

const normalizeCreatePayload = (payload = {}) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const adminUser = source.adminUser && typeof source.adminUser === 'object' && !Array.isArray(source.adminUser)
    ? source.adminUser
    : {};
  const resellerName = trimOrEmpty(source.name);
  const adminName = trimOrEmpty(adminUser.name || source.adminUserName || source.adminName || '') || `${resellerName || 'Reseller'} Admin`;
  const adminEmail = trimOrEmpty(adminUser.email || source.adminUserEmail || '').toLowerCase();
  const adminPasswordRaw = String(adminUser.password || source.adminUserPassword || '').trim();

  return {
    resellerPayload: {
      name: source.name,
      websiteName: source.websiteName,
      primaryDomain: source.primaryDomain,
      domains: source.domains || source.domain,
      defaultMarginPercent: source.defaultMarginPercent,
      isActive: source.isActive
    },
    adminName,
    adminEmail,
    adminPasswordRaw
  };
};

const resolveErrorStatus = (error, fallback = 400) => {
  const normalizedMessage = String(error?.message || '').trim().toLowerCase();
  if (normalizedMessage.includes('not found')) {
    return 404;
  }
  if (normalizedMessage.includes('already in use') || normalizedMessage.includes('duplicate')) {
    return 409;
  }
  return fallback;
};

const getAdminResellers = async (_req, res) => {
  const resellers = await listResellers();
  return res.json({
    resellers,
    total: resellers.length
  });
};

const createAdminReseller = async (req, res) => {
  let createdReseller = null;
  let createdUser = null;

  try {
    const { resellerPayload, adminName, adminEmail, adminPasswordRaw } = normalizeCreatePayload(req.body || {});

    if (!adminEmail) {
      return res.status(400).json({ message: 'Reseller admin email is required' });
    }
    if (!emailPattern.test(adminEmail)) {
      return res.status(400).json({ message: 'Reseller admin email is invalid' });
    }
    if (adminName.length > 120) {
      return res.status(400).json({ message: 'Reseller admin name must be 120 characters or less' });
    }

    const existingUser = await User.findOne({ email: adminEmail }).select('_id');
    if (existingUser) {
      return res.status(409).json({ message: 'Reseller admin email already in use' });
    }

    createdReseller = await createReseller(resellerPayload);

    const generatedPassword = generateResellerPassword();
    const finalPassword = adminPasswordRaw || generatedPassword;
    if (finalPassword.length < 6) {
      throw new Error('Reseller admin password must be at least 6 characters');
    }

    createdUser = await User.create({
      name: adminName,
      email: adminEmail,
      password: finalPassword,
      isAdmin: false,
      isResellerAdmin: true,
      resellerId: createdReseller.id
    });

    const created = await updateReseller(createdReseller.id, {
      adminUserId: String(createdUser._id),
      adminUserEmail: createdUser.email
    });

    return res.status(201).json({
      message: 'Reseller website created successfully',
      reseller: created,
      credentials: {
        name: createdUser.name,
        email: createdUser.email,
        password: finalPassword,
        generatedPassword: !adminPasswordRaw
      }
    });
  } catch (error) {
    if (createdReseller?.id) {
      try {
        if (createdUser?._id) {
          await User.deleteOne({ _id: createdUser._id });
        }
        await deleteReseller(createdReseller.id);
      } catch {
        // Ignore rollback failures; original error is returned.
      }
    }
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to create reseller website' });
  }
};

const updateAdminReseller = async (req, res) => {
  try {
    const updated = await updateReseller(req.params.id, req.body || {});
    return res.json({
      message: 'Reseller website updated successfully',
      reseller: updated
    });
  } catch (error) {
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to update reseller website' });
  }
};

const deleteAdminReseller = async (req, res) => {
  try {
    const removed = await deleteReseller(req.params.id);
    return res.json({
      message: 'Reseller website deleted successfully',
      reseller: removed
    });
  } catch (error) {
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to delete reseller website' });
  }
};

const setAdminResellerDefaultMargin = async (req, res) => {
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'marginPercent')) {
    return res.status(400).json({ message: 'marginPercent is required' });
  }

  try {
    const updated = await setResellerDefaultMargin(req.params.id, req.body.marginPercent, {
      clearProductOverrides: Boolean(req.body?.clearProductOverrides)
    });
    return res.json({
      message: 'Default margin updated for reseller',
      reseller: updated
    });
  } catch (error) {
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to update default margin' });
  }
};

const setAdminResellerProductMargins = async (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
  if (updates.length === 0) {
    return res.status(400).json({ message: 'updates must be a non-empty array' });
  }

  try {
    const updated = await setResellerProductMargins(req.params.id, updates);
    return res.json({
      message: 'Product margins updated successfully',
      reseller: updated
    });
  } catch (error) {
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to update product margins' });
  }
};

const getAdminResellerById = async (req, res) => {
  const reseller = await getResellerById(req.params.id);
  if (!reseller) {
    return res.status(404).json({ message: 'Reseller not found' });
  }
  return res.json({ reseller });
};

const getSelfReseller = async (req, res) => {
  const reseller = await getResellerById(req.user?.resellerId || '');
  if (!reseller) {
    return res.status(404).json({ message: 'Reseller not found' });
  }
  return res.json({ reseller });
};

const setSelfResellerDefaultMargin = async (req, res) => {
  if (!Object.prototype.hasOwnProperty.call(req.body || {}, 'marginPercent')) {
    return res.status(400).json({ message: 'marginPercent is required' });
  }

  try {
    const updated = await setResellerDefaultMargin(req.user?.resellerId || '', req.body.marginPercent, {
      clearProductOverrides: Boolean(req.body?.clearProductOverrides)
    });
    return res.json({
      message: 'Default margin updated for reseller',
      reseller: updated
    });
  } catch (error) {
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to update default margin' });
  }
};

const setSelfResellerProductMargins = async (req, res) => {
  const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
  if (updates.length === 0) {
    return res.status(400).json({ message: 'updates must be a non-empty array' });
  }

  try {
    const updated = await setResellerProductMargins(req.user?.resellerId || '', updates);
    return res.json({
      message: 'Product margins updated successfully',
      reseller: updated
    });
  } catch (error) {
    const status = resolveErrorStatus(error, 400);
    return res.status(status).json({ message: error.message || 'Failed to update product margins' });
  }
};

module.exports = {
  getAdminResellers,
  createAdminReseller,
  updateAdminReseller,
  deleteAdminReseller,
  setAdminResellerDefaultMargin,
  setAdminResellerProductMargins,
  getAdminResellerById,
  getSelfReseller,
  setSelfResellerDefaultMargin,
  setSelfResellerProductMargins
};
