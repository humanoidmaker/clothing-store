const express = require('express');
const { createOrder, getMyOrders, getAllOrders } = require('../controllers/orderController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/', protect, admin, getAllOrders);

module.exports = router;
