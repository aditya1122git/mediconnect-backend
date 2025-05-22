const mongoose = require('mongoose');

// Define a sub-schema for qualifications
const QualificationSchema = new mongoose.Schema({
  degree: {
    type: String,
    required: true
  },
  institution: {
    type: String,
    required: true
  },
  year: {
    type: String
  }
}, { _id: false });

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    required: true
    
  },
  specialization: {
    type: String,
    required: function() {
      return this.role === 'doctor'; // Only required for doctors
    }
  },
  // Doctor specific fields
  qualifications: {
    type: [QualificationSchema],
    default: []
  },
  experience: {
    type: String
  },
  about: {
    type: String
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  height: Number,
  weight: Number,
  conditions: [String],
  allergies: [String],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  }
});

module.exports = mongoose.model('Profile', ProfileSchema);