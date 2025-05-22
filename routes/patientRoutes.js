const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatientById,
  getPatientRecords,
  getVisitedPatients
} = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes protected by auth middleware
router.use(authMiddleware);

// Check if user is doctor middleware
const doctorOnly = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({
      success: false, 
      error: 'Access denied. Only doctors can access patient data'
    });
  }
  next();
};

// @route   GET /api/patients
// @desc    Get all patients
// @access  Private/Doctor
router.get('/', doctorOnly, getPatients);

// @route   GET /api/patients/visited
// @desc    Get visited patients
// @access  Private/Doctor
router.get('/visited', doctorOnly, getVisitedPatients);

// @route   GET /api/patients/:id
// @desc    Get single patient by ID
// @access  Private/Doctor
router.get('/:id', doctorOnly, getPatientById);

// @route   GET /api/patients/:id/records
// @desc    Get health records for a patient
// @access  Private/Doctor
router.get('/:id/records', doctorOnly, getPatientRecords);

module.exports = router; 