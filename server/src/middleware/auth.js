const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user missing' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const optionalProtect = async (req, _res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore token parse errors for public routes.
  }

  return next();
};

const admin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

const resellerAdmin = (req, res, next) => {
  if (!req.user || !req.user.isResellerAdmin || !String(req.user.resellerId || '').trim()) {
    return res.status(403).json({ message: 'Reseller admin access required' });
  }
  next();
};

const adminOrReseller = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Admin or reseller access required' });
  }
  if (req.user.isAdmin) {
    return next();
  }
  if (req.user.isResellerAdmin && String(req.user.resellerId || '').trim()) {
    return next();
  }
  return res.status(403).json({ message: 'Admin or reseller access required' });
};

module.exports = { protect, optionalProtect, admin, resellerAdmin, adminOrReseller };
