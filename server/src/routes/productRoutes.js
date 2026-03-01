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
const { protect, optionalProtect, admin, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(optionalProtect, getProducts).post(protect, admin, createProduct);
router.get('/filters', optionalProtect, getProductFilterOptions);
router.get('/admin/reviews', protect, adminOrReseller, getAdminProductReviews);
router.put('/admin/reviews/:productId/:reviewId/visibility', protect, adminOrReseller, setProductReviewVisibility);
router.post('/:id/reviews', protect, createProductReview);
router.route('/:id').get(optionalProtect, getProductById).put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;
