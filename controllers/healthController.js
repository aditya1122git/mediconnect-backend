const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const { validateHealthRecord, isValidObjectId } = require('../utils/validation');

// @desc    Get all health records (filtered by user role)
// @route   GET /api/health
// @access  Private
exports.getHealthRecords = async (req, res) => {
  try {
    let query;

    // For Patients: Only their records
    if (req.user.role === 'patient') {
      query = { patient: req.user.id };
    } 
    // For Doctors: Records they created
    else {
      query = { doctor: req.user.id };
    }

    // Optional Filters
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(req.query.endDate);
    }

    const records = await HealthRecord.find(query)
      .populate('patient', 'name email')
      .populate('doctor', 'name specialization')
      .sort('-date');

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Get single health record by ID
// @route   GET /api/health/:id
// @access  Private
exports.getHealthRecord = async (req, res) => {
  try {
    // Check if ID is valid
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }

    const record = await HealthRecord.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name specialization');

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Health record not found'
      });
    }

    // Check authorization (only doctor who created or patient it belongs to can view)
    if (
      req.user.role === 'doctor' && record.doctor.toString() !== req.user.id &&
      req.user.role === 'patient' && record.patient.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this record'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Add new health record
// @route   POST /api/health/record
// @access  Private
exports.addHealthRecord = async (req, res) => {
  try {
    console.log('Adding health record. User:', req.user.id, 'Role:', req.user.role);
    
    // If doctor is creating record, require patientId
    if (req.user.role === 'doctor') {
      if (!req.body.patientId) {
        console.log('Doctor attempted to create record without specifying patient');
        return res.status(400).json({
          success: false,
          error: 'Patient ID is required when doctor creates a record'
        });
      }
      
      // Check if patient exists
      const patient = await User.findOne({
        _id: req.body.patientId,
        role: 'patient'
      });
      
      if (!patient) {
        console.log('Doctor attempted to create record for non-existent patient');
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }
    } else if (req.user.role !== 'patient') {
      // Only doctors and patients can create records
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create health records'
      });
    }
    
    console.log('Record data:', req.body);
    
    // Prepare record data
    const recordData = {
      date: req.body.date || Date.now(),
      bloodPressure: req.body.bloodPressure,
      heartRate: req.body.heartRate,
      weight: req.body.weight,
      glucoseLevel: req.body.glucoseLevel,
      symptoms: req.body.symptoms,
      medications: req.body.medications,
      notes: req.body.notes
    };
    
    // Set patient/doctor fields based on role
    if (req.user.role === 'patient') {
      recordData.patient = req.user.id;
      recordData.user = req.user.id;
    } else if (req.user.role === 'doctor') {
      recordData.doctor = req.user.id;
      recordData.patient = req.body.patientId;
      recordData.user = req.body.patientId; // User is the patient, not the doctor
    }
    
    console.log('Creating record with data:', recordData);
    
    // Create the record
    const record = await HealthRecord.create(recordData);

    res.status(201).json({
      success: true,
      data: record
    });

  } catch (err) {
    console.error('Error adding health record:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Update health record
// @route   PUT /api/health/:id
// @access  Private/Doctor
exports.updateHealthRecord = async (req, res) => {
  try {
    // Check if ID is valid
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }

    let record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Health record not found'
      });
    }

    // Check if doctor is the one who created the record
    if (record.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this record'
      });
    }

    // Validate update data if provided
    if (Object.keys(req.body).length > 0) {
      const { error } = validateHealthRecord(req.body, true); // true for partial validation
      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details.map(err => err.message)
        });
      }
    }

    // Update record
    record = await HealthRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patient', 'name email').populate('doctor', 'name specialization');

    res.status(200).json({
      success: true,
      data: record
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};

// @desc    Delete health record
// @route   DELETE /api/health/:id
// @access  Private/Doctor
exports.deleteHealthRecord = async (req, res) => {
  try {
    // Check if ID is valid
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }

    const record = await HealthRecord.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Health record not found'
      });
    }

    // Check authorization:
    // 1. Doctor who created the record can delete it
    // 2. Patient who owns the record can delete it
    if (
      (req.user.role === 'doctor' && record.doctor && record.doctor.toString() !== req.user.id) && 
      (req.user.role === 'patient' && record.patient.toString() !== req.user.id)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this record'
      });
    }

    // Using findByIdAndDelete instead of record.remove() which is deprecated
    await HealthRecord.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};