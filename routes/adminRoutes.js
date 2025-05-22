const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getAllDoctors,
  getAllPatients,
  getUserById,
  deleteUser,
  deleteAllDoctors,
  deleteAllPatients,
  updateAdminProfile,
  changeAdminPassword
} = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes protected by auth middleware
router.use(authMiddleware);

// Admin middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin only.'
    });
  }
  next();
};

// Simple test route to verify route configuration
router.get('/test-profile-route', (req, res) => {
  console.log('Admin profile test route accessed');
  console.log('User from request:', req.user.id, req.user.role);
  return res.status(200).json({ 
    success: true, 
    message: 'Admin profile route is working',
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

// Apply adminOnly middleware to all routes
router.use(adminOnly);

// User routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);

// Force delete route must come BEFORE the regular delete route
router.delete('/users/force-delete/:id', (req, res, next) => {
  req.headers['bypass-auth'] = 'true';
  next();
}, deleteUser);

// Regular delete route
router.delete('/users/:id', deleteUser);

// Doctor routes
router.get('/doctors', getAllDoctors);
router.delete('/doctors', deleteAllDoctors);

// Patient routes
router.get('/patients', getAllPatients);
router.delete('/patients', deleteAllPatients);

// Admin profile routes
router.put('/profile', updateAdminProfile);
router.put('/change-password', changeAdminPassword);

module.exports = router; 