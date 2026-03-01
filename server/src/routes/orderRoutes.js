const express = require('express');
const {
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
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createOrder);
router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPaymentAndCreateOrder);
router.get('/payment/options', protect, getPaymentGatewayOptions);
router.post('/payment/initiate', protect, createPaymentIntent);
router.post('/payment/verify', protect, verifyPaymentAndCreateOrder);
router.post('/payment/payu/callback', payuCallbackRedirect);
router.get('/my', protect, getMyOrders);
router.get('/my/:id', protect, getMyOrderById);
router.get('/reports/summary', protect, admin, getOrderReports);
router.get('/', protect, admin, getAllOrders);
router.put('/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
