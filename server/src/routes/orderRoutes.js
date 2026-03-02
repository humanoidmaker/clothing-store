const express = require('express');
const {
  createOrder,
  createManualInvoice,
  createRazorpayOrder,
  verifyRazorpayPaymentAndCreateOrder,
  getPaymentGatewayOptions,
  validateCouponForCheckout,
  createPaymentIntent,
  verifyPaymentAndCreateOrder,
  payuCallbackRedirect,
  getMyOrders,
  getMyOrderById,
  getAllOrders,
  updateOrderStatus,
  getOrderReports
} = require('../controllers/orderController');
const { protect, admin, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createOrder);
router.post('/admin/manual-invoice', protect, admin, createManualInvoice);
router.post('/razorpay/order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPaymentAndCreateOrder);
router.get('/payment/options', protect, getPaymentGatewayOptions);
router.post('/coupon/validate', protect, validateCouponForCheckout);
router.post('/payment/initiate', protect, createPaymentIntent);
router.post('/payment/verify', protect, verifyPaymentAndCreateOrder);
router.post('/payment/payu/callback', payuCallbackRedirect);
router.get('/my', protect, getMyOrders);
router.get('/my/:id', protect, getMyOrderById);
router.get('/reports/summary', protect, adminOrReseller, getOrderReports);
router.get('/', protect, adminOrReseller, getAllOrders);
router.put('/:id/status', protect, adminOrReseller, updateOrderStatus);

module.exports = router;
