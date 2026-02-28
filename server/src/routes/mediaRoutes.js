const express = require('express');
const {
  listMediaAssets,
  createMediaAssets,
  updateMediaAsset,
  deleteMediaAsset
} = require('../controllers/mediaController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, admin, listMediaAssets);
router.post('/', protect, admin, createMediaAssets);
router.put('/:id', protect, admin, updateMediaAsset);
router.delete('/:id', protect, admin, deleteMediaAsset);

module.exports = router;
