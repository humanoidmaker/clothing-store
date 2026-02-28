const express = require('express');
const {
  getProducts,
  getProductFilterOptions,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getProducts).post(protect, admin, createProduct);
router.get('/filters', getProductFilterOptions);
router.route('/:id').get(getProductById).put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;
