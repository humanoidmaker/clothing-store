const express = require('express');
const {
  getProducts,
  getProductFilterOptions,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, optionalProtect, admin } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(optionalProtect, getProducts).post(protect, admin, createProduct);
router.get('/filters', optionalProtect, getProductFilterOptions);
router.route('/:id').get(optionalProtect, getProductById).put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);

module.exports = router;
