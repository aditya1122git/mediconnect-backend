const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  getDoctorAvailability
} = require('../controllers/doctorController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes protected by auth middleware
router.use(authMiddleware);

// @route   GET /api/doctors
// @desc    Get all doctors
// @access  Private
router.get('/', getDoctors);

// @route   GET /api/doctors/:id
// @desc    Get doctor by ID
// @access  Private
router.get('/:id', getDoctorById);

// @route   GET /api/doctors/:id/availability
// @desc    Get doctor availability
// @access  Private
router.get('/:id/availability', getDoctorAvailability);

module.exports = router; 