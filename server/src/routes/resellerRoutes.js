const express = require('express');
const {
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
} = require('../controllers/resellerController');
const { protect, admin, resellerAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, admin, getAdminResellers);
router.post('/admin', protect, admin, createAdminReseller);
router.get('/admin/:id', protect, admin, getAdminResellerById);
router.put('/admin/:id', protect, admin, updateAdminReseller);
router.delete('/admin/:id', protect, admin, deleteAdminReseller);
router.put('/admin/:id/margins/default', protect, admin, setAdminResellerDefaultMargin);
router.put('/admin/:id/margins/products', protect, admin, setAdminResellerProductMargins);
router.get('/me', protect, resellerAdmin, getSelfReseller);
router.put('/me/margins/default', protect, resellerAdmin, setSelfResellerDefaultMargin);
router.put('/me/margins/products', protect, resellerAdmin, setSelfResellerProductMargins);

module.exports = router;
