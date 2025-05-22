const express = require('express');
const {
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/profileController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
  console.log('Profile test route accessed');
  return res.status(200).json({ message: 'Profile router is working' });
});

router
  .route('/me')
  .get(authMiddleware, (req, res, next) => {
    console.log('Profile /me GET route accessed');
    console.log('User ID from token:', req.user?.id);
    next();
  }, getProfile)
  .put(authMiddleware, updateProfile);

router.put('/change-password', authMiddleware, changePassword);

module.exports = router;