const express = require('express');
const {
  getProducts,
  getProductFilterOptions,
  getProductById,
  createProductReview,
  getAdminProductReviews,
  setProductReviewVisibility,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, optionalProtect, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(optionalProtect, getProducts).post(protect, adminOrReseller, createProduct);
router.get('/filters', optionalProtect, getProductFilterOptions);
router.get('/admin/reviews', protect, adminOrReseller, getAdminProductReviews);
router.put('/admin/reviews/:productId/:reviewId/visibility', protect, adminOrReseller, setProductReviewVisibility);
router.post('/:id/reviews', protect, createProductReview);
router
  .route('/:id')
  .get(optionalProtect, getProductById)
  .put(protect, adminOrReseller, updateProduct)
  .delete(protect, adminOrReseller, deleteProduct);

module.exports = router;
