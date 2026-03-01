const express = require('express');
const {
  getSeoAdminData,
  updateSeoDefaults,
  upsertPublicPageSeo,
  deletePublicPageSeo,
  getSeoProducts,
  getSeoProductById,
  updateSeoProduct
} = require('../controllers/seoController');
const { protect, admin, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, adminOrReseller, getSeoAdminData);
router.put('/defaults', protect, adminOrReseller, updateSeoDefaults);
router.put('/public-page', protect, adminOrReseller, upsertPublicPageSeo);
router.delete('/public-page/:key', protect, adminOrReseller, deletePublicPageSeo);
router.get('/products', protect, admin, getSeoProducts);
router.get('/products/:id', protect, admin, getSeoProductById);
router.put('/products/:id', protect, admin, updateSeoProduct);

module.exports = router;
