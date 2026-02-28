const express = require('express');
const {
  createOrder,
  createRazorpayOrder,
  verifyRazorpayPaymentAndCreateOrder,
  getMyOrders,
  getMyOrderById,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createOrder);
router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPaymentAndCreateOrder);
router.get('/my', protect, getMyOrders);
router.get('/my/:id', protect, getMyOrderById);
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
