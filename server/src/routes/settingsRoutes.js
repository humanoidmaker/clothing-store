const express = require('express');
const { getStoreSettings, updateStoreSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getStoreSettings).put(protect, admin, updateStoreSettings);

module.exports = router;
