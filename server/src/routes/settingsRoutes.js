const express = require('express');
const { getStoreSettings, getAdminStoreSettings, updateStoreSettings } = require('../controllers/settingsController');
const { protect, optionalProtect, adminOrReseller } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, adminOrReseller, getAdminStoreSettings);
router.route('/').get(optionalProtect, getStoreSettings).put(protect, adminOrReseller, updateStoreSettings);

module.exports = router;
