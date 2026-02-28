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
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, admin, getSeoAdminData);
router.put('/defaults', protect, admin, updateSeoDefaults);
router.put('/public-page', protect, admin, upsertPublicPageSeo);
router.delete('/public-page/:key', protect, admin, deletePublicPageSeo);
router.get('/products', protect, admin, getSeoProducts);
router.get('/products/:id', protect, admin, getSeoProductById);
router.put('/products/:id', protect, admin, updateSeoProduct);

module.exports = router;
