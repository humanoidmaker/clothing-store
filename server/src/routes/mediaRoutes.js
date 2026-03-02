const express = require('express');
const {
  listMediaAssets,
  createMediaAssets,
  updateMediaAsset,
  deleteMediaAsset
} = require('../controllers/mediaController');
const { protect, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, adminOrReseller, listMediaAssets);
router.post('/', protect, adminOrReseller, createMediaAssets);
router.put('/:id', protect, adminOrReseller, updateMediaAsset);
router.delete('/:id', protect, adminOrReseller, deleteMediaAsset);

module.exports = router;
