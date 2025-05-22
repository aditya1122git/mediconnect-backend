const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  markAppointmentVisited
} = require('../controllers/appointmentController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes protected by auth middleware
router.use(authMiddleware);

// @route   POST /api/appointments
// @desc    Create new appointment
// @access  Private/Patient
router.post('/', createAppointment);

// @route   GET /api/appointments
// @desc    Get all user's appointments
// @access  Private
router.get('/', getMyAppointments);

// @route   GET /api/appointments/:id
// @desc    Get appointment by ID
// @access  Private
router.get('/:id', getAppointment);

// @route   PUT /api/appointments/:id
// @desc    Update appointment status
// @access  Private/Doctor
router.put('/:id', updateAppointmentStatus);

// @route   PUT /api/appointments/:id/visited
// @desc    Mark appointment as visited
// @access  Private/Doctor
router.put('/:id/visited', markAppointmentVisited);

// @route   DELETE /api/appointments/:id
// @desc    Cancel appointment
// @access  Private
router.delete('/:id', cancelAppointment);

module.exports = router; 