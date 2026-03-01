const express = require('express');
const { getStoreSettings, getAdminStoreSettings, updateStoreSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', protect, admin, getAdminStoreSettings);
router.route('/').get(getStoreSettings).put(protect, admin, updateStoreSettings);

module.exports = router;
