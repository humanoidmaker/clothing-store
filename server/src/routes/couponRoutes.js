const express = require('express');
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon
} = require('../controllers/couponController');
const { protect, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(protect, adminOrReseller, listCoupons)
  .post(protect, adminOrReseller, createCoupon);

router.route('/:id')
  .put(protect, adminOrReseller, updateCoupon)
  .delete(protect, adminOrReseller, deleteCoupon);

module.exports = router;
