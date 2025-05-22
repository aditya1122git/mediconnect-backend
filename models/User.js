const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  phone: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],

  },

  specialization: {
    type: String,
    required: function() {
      return this.role === 'doctor'; // Only required for doctors
    }
  },
  // Doctor specific fields
  patientsCount: {
    type: Number,
    default: 0
  },
  patientsServed: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  height: {
  type: Number,
  validate: {
    validator: function(value) {
      if (this.role === 'patient') {
        return value != null;
      }
      return true; // doctor ke liye validation pass ho jaye
    },
    message: 'Height is required for patients'
  }
},

  weight: {
  type: Number,
  validate: {
    validator: function(value) {
      if (this.role === 'patient') {
        return value != null;
      }
      return true;
    },
    message: 'Weight is required for patients'
  }
},

  emergencyContact: {
     name: {
      type: String,
      //default: ''
      required: function() {
      return false; // Making it optional for all users
    }
    },
    relationship: {
      type: String,
      //default: ''
      required: function() {
      return false; // Making it optional for all users
    }
    },
    phone: {
      type: String,
      //default: ''
      required: function() {
      return false; // Making it optional for all users
    }
    },
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
 });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  console.log('Password pre-save hook triggered');
  
  // Only hash the password if it's modified
  if (!this.isModified('password')) {
    console.log('Password not modified, skipping hash');
    return next();
  }
  
  try {
    console.log('Hashing password for user:', this._id || 'new user');
    
    // Use consistent bcrypt settings
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    
    // Hash the password with the generated salt
    this.password = await bcrypt.hash(this.password, salt);
    
    // Log the hash format for debugging
    console.log('Password hashed successfully. Format:', this.password.substring(0, 7) + '...');
    next();
  } catch (err) {
    console.error('Error hashing password:', err);
    next(err);
  }
});

module.exports = mongoose.model('User', UserSchema);