const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { isValidObjectId } = require('../utils/validation');

// @desc    Create new appointment request
// @route   POST /api/appointments
// @access  Private/Patient
exports.createAppointment = async (req, res) => {
  try {
    // Check if user is a patient
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        error: 'Only patients can request appointments'
      });
    }

    // Check if doctor exists
    if (!isValidObjectId(req.body.doctorId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid doctor ID format'
      });
    }

    const doctor = await User.findOne({
      _id: req.body.doctorId,
      role: 'doctor'
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient: req.user.id,
      doctor: req.body.doctorId,
      date: req.body.date,
      timeSlot: req.body.timeSlot,
      reason: req.body.reason,
      notes: req.body.notes || ''
    });

    res.status(201).json({
      success: true,
      data: appointment
    });

  } catch (err) {
    console.error('Error creating appointment:', err);
    
    // Handle duplicate appointment error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'The selected time slot is already booked'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Get all appointments for current user
// @route   GET /api/appointments
// @access  Private
exports.getMyAppointments = async (req, res) => {
  try {
    let query = {};
    
    // Filter by role
    if (req.user.role === 'patient') {
      query.patient = req.user.id;
      
      // Add status filtering for patients similar to doctors
      if (req.query.status === 'all') {
        // Show all statuses, no additional status filter
        console.log('Patient viewing ALL appointments');
      } else if (req.query.status) {
        // If specific status is requested, use that
        query.status = req.query.status;
        console.log(`Patient filtering appointments by status: ${req.query.status}`);
      }
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user.id;
      
      // For doctors:
      // - If status is 'all', don't filter by status
      // - If status is specified (pending, confirmed, etc.), filter by that status
      // - If no status is specified, default to confirmed and completed
      if (req.query.status === 'all') {
        // Show all statuses, no additional status filter
        console.log('Doctor viewing ALL appointments (including pending)');
      } else if (req.query.status) {
        // If specific status is requested, use that
        query.status = req.query.status;
        console.log(`Doctor filtering appointments by status: ${req.query.status}`);
      } else {
        // By default, only show confirmed and completed appointments for doctors
        query.status = { $in: ['confirmed', 'completed'] };
        console.log('Doctor viewing default appointments (confirmed & completed)');
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Optional date filter
    if (req.query.startDate) {
      query.date = { $gte: new Date(req.query.startDate) };
    }
    if (req.query.endDate) {
      query.date = { ...query.date, $lte: new Date(req.query.endDate) };
    }
    
    console.log('Appointment query:', JSON.stringify(query));
    
    const appointments = await Appointment.find(query)
      .populate('patient', 'name email')
      .populate('doctor', 'name email specialization')
      .sort({ date: 1, timeSlot: 1 });

    console.log(`Found ${appointments.length} appointments`);
    
    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });

  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID format'
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email specialization');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check if user is authorized to view this appointment
    if (
      appointment.patient._id.toString() !== req.user.id && 
      appointment.doctor._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this appointment'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });

  } catch (err) {
    console.error('Error fetching appointment:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Update appointment status (Doctor only)
// @route   PUT /api/appointments/:id
// @access  Private/Doctor
exports.updateAppointmentStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID format'
      });
    }

    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Only doctors can update appointment status'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check if doctor is authorized to update this appointment
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this appointment'
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    // Update appointment
    appointment.status = req.body.status;
    if (req.body.notes) {
      appointment.notes = req.body.notes;
    }
    
    await appointment.save();

    const updatedAppointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email specialization');

    res.status(200).json({
      success: true,
      data: updatedAppointment
    });

  } catch (err) {
    console.error('Error updating appointment:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Cancel appointment (Patient can only cancel their own)
// @route   DELETE /api/appointments/:id
// @access  Private
exports.cancelAppointment = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID format'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check if user is authorized to cancel this appointment
    if (
      req.user.role === 'patient' && appointment.patient.toString() !== req.user.id ||
      req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this appointment'
      });
    }

    // Update status to cancelled
    appointment.status = 'cancelled';
    appointment.notes = `${appointment.notes}\nCancelled by ${req.user.role} on ${new Date().toISOString()}`;
    
    await appointment.save();

    res.status(200).json({
      success: true,
      data: {}
    });

  } catch (err) {
    console.error('Error cancelling appointment:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// @desc    Mark appointment as visited (Doctor only)
// @route   PUT /api/appointments/:id/visited
// @access  Private/Doctor
exports.markAppointmentVisited = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment ID format'
      });
    }

    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        error: 'Only doctors can mark appointments as visited'
      });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check if doctor is authorized to update this appointment
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this appointment'
      });
    }

    // Check if the appointment is in confirmed or completed status
    if (appointment.status !== 'confirmed' && appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only confirmed or completed appointments can be marked as visited'
      });
    }

    // Update appointment
    appointment.visited = true;
    appointment.status = 'completed'; // Automatically mark as completed when visited
    if (req.body.notes) {
      appointment.notes = req.body.notes;
    }
    
    await appointment.save();

    // Update doctor's patient stats
    const doctor = await User.findById(req.user.id);
    const patientId = appointment.patient.toString();
    
    // Check if this patient has already been served by this doctor
    const isNewPatient = !doctor.patientsServed.includes(patientId);
    
    if (isNewPatient) {
      // Add patient to doctor's served patients list and increment count
      doctor.patientsServed.push(patientId);
      doctor.patientsCount += 1;
      await doctor.save();
    }

    const updatedAppointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email specialization');

    res.status(200).json({
      success: true,
      data: updatedAppointment
    });

  } catch (err) {
    console.error('Error marking appointment as visited:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
}; 