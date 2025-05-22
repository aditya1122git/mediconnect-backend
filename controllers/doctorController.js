const User = require('../models/User');
const Profile = require('../models/Profile');
const { isValidObjectId } = require('../utils/validation');

// @desc    Get all doctors
// @route   GET /api/doctors
// @access  Private
exports.getDoctors = async (req, res) => {
  try {
    // Basic query
    const query = { role: 'doctor' };
    
    // Filter by specialization if provided
    if (req.query.specialization) {
      query.specialization = new RegExp(req.query.specialization, 'i'); // Case-insensitive match
    }
    
    // Filter by name if provided
    if (req.query.name) {
      query.name = new RegExp(req.query.name, 'i');
    }
    
    // Find all doctors with optional filters
    const doctors = await User.find(query)
      .select('name specialization gender')
      .sort('name');

    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Get doctor by ID
// @route   GET /api/doctors/:id
// @access  Private
exports.getDoctorById = async (req, res) => {
  try {
    // Validate ID format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor ID format'
      });
    }
    
    // Find doctor by ID
    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor'
    }).select('-password');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    // Get doctor's profile if exists
    const profile = await Profile.findOne({ user: doctor._id });

    // Log doctor profile for debugging
    console.log('Doctor profile for patient view:', profile ? 'found' : 'not found');

    res.status(200).json({
      success: true,
      data: {
        ...doctor._doc,
        profile: profile || null
      }
    });
  } catch (err) {
    console.error('Error fetching doctor:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Get doctor's available time slots
// @route   GET /api/doctors/:id/availability
// @access  Private
exports.getDoctorAvailability = async (req, res) => {
  try {
    // Validate ID format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor ID format'
      });
    }
    
    // Validate date parameter
    const date = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }
    
    // Check if doctor exists
    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor'
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    // Get doctor's appointments for the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookedSlots = await require('../models/Appointment').find({
      doctor: req.params.id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] }
    }).select('timeSlot');
    
    // Define available time slots (9 AM to 5 PM, 1-hour slots)
    const allTimeSlots = [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];
    
    // Filter out booked slots
    const bookedSlotsArray = bookedSlots.map(slot => slot.timeSlot);
    const availableSlots = allTimeSlots.filter(slot => !bookedSlotsArray.includes(slot));
    
    res.status(200).json({
      success: true,
      date: date.toISOString().split('T')[0],
      availableSlots
    });
  } catch (err) {
    console.error('Error fetching doctor availability:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
}; 