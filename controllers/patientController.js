const User = require('../models/User');
const Profile = require('../models/Profile');
const Appointment = require('../models/Appointment');

// @desc    Get all patients (Doctors only)
// @route   GET /api/patients
// @access  Private/Doctor
exports.getPatients = async (req, res) => {
  try {
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only doctors can view patients'
      });
    }

    // Get all patients
    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort('name');

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Get doctor's patients (Visited patients + Confirmed appointments)
// @route   GET /api/patients/visited
// @access  Private/Doctor
exports.getVisitedPatients = async (req, res) => {
  try {
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only doctors can view patients'
      });
    }

    console.log('Fetching visited patients for doctor:', req.user.id);

    // Get all patient IDs from:
    // 1. Appointments where patient visited this doctor
    // 2. Appointments that are confirmed but not yet visited
    // 3. Appointments that are marked as completed
    const visitedAppointments = await Appointment.find({
      doctor: req.user.id,
      $or: [
        // Patients who have visited
        { visited: true },
        // Patients with confirmed appointments
        { status: 'confirmed' },
        // Patients with completed appointments
        { status: 'completed' }
      ]
    }).select('patient');

    console.log('Found appointments count:', visitedAppointments.length);

    // Extract unique patient IDs
    const patientIds = [...new Set(
      visitedAppointments.map(appointment => appointment.patient.toString())
    )];

    console.log('Unique patient IDs found:', patientIds.length);

    // Get patient details
    const patients = await User.find({ 
      _id: { $in: patientIds },
      role: 'patient'
    })
      .select('-password')
      .sort('name');

    console.log('Final patients count:', patients.length);

    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (err) {
    console.error('Error fetching doctor\'s patients:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Get single patient by ID (Doctors only)
// @route   GET /api/patients/:id
// @access  Private/Doctor
exports.getPatientById = async (req, res) => {
  try {
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only doctors can view patient details'
      });
    }

    const patient = await User.findOne({
      _id: req.params.id,
      role: 'patient'
    }).select('-password');

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Get patient's profile if exists
    const profile = await Profile.findOne({ user: patient._id });

    res.status(200).json({
      success: true,
      data: {
        ...patient._doc,
        profile: profile || null
      }
    });
  } catch (err) {
    console.error('Error fetching patient:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Get health records for a patient (Doctor only)
// @route   GET /api/patients/:id/records
// @access  Private/Doctor
exports.getPatientRecords = async (req, res) => {
  try {
    // Check if user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only doctors can view patient records'
      });
    }

    // Check if patient exists
    const patient = await User.findOne({
      _id: req.params.id,
      role: 'patient'
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Get patient's health records
    const healthRecords = await require('../models/HealthRecord').find({
      patient: req.params.id
    }).populate('doctor', 'name specialization').sort('-date');

    res.status(200).json({
      success: true,
      count: healthRecords.length,
      data: healthRecords
    });
  } catch (err) {
    console.error('Error fetching patient records:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
}; 