const express = require('express');
const { registerUser, loginUser, getCurrentUser, updateCurrentUser } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.route('/me').get(protect, getCurrentUser).put(protect, updateCurrentUser);

module.exports = router;
