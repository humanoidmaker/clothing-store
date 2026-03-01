const express = require('express');
const {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  getAdminUsers,
  updateCurrentUser
} = require('../controllers/authController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.route('/me').get(protect, getCurrentUser).put(protect, updateCurrentUser);
router.get('/admin/users', protect, admin, getAdminUsers);

module.exports = router;
