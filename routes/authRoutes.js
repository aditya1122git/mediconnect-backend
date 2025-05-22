const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateUserRegistration, validateUserLogin } = require('../utils/validation');
const authMiddleware = require('../middlewares/authMiddleware');
const JWT_CONFIG = require('../config/jwtConfig');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt with data:', { 
      ...req.body,
      password: req.body.password ? '******' : undefined 
    });
    
    const validation = validateUserRegistration(req.body);
    const { errors, isValid } = validation;
    
    if (!isValid) {
      console.log('Registration validation failed:', errors);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors
      });
    }

    const { name, email, password, role, specialization, dateOfBirth, gender, height, weight, emergencyContact } = req.body;
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('Registration failed: Email already exists:', email);
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Create new user with proper handling of emergency contact
    const userData = {
      name,
      email,
      password,
      role,
      dateOfBirth,
      gender
    };
    
    // Add role-specific fields
    if (role === 'doctor') {
      userData.specialization = specialization;
    } else if (role === 'patient') {
      userData.height = height;
      userData.weight = weight;
      
      // Only add emergency contact if it has values
      if (emergencyContact && (
          emergencyContact.name || 
          emergencyContact.relationship || 
          emergencyContact.phone)) {
        userData.emergencyContact = {
          name: emergencyContact.name || '',
          relationship: emergencyContact.relationship || '',
          phone: emergencyContact.phone || ''
        };
      }
    }
    
    console.log('Creating new user with data:', {
      name,
      email,
      role,
      specialization: role === 'doctor' ? specialization : undefined,
      hasEmergencyContact: role === 'patient' && userData.emergencyContact ? true : false
    });
    
    user = new User(userData);
    
    try {
      await user.save();
      console.log('User saved successfully with ID:', user.id);
    } catch (saveErr) {
      console.error('Error saving user:', saveErr);
      return res.status(400).json({
        success: false,
        message: 'Error creating user account',
        error: saveErr.message
      });
    }

    // Create JWT token
    const payload = { 
      user: {
        id: user.id,
        role: user.role,
        email: user.email
      } 
    };
    
    const token = jwt.sign(
      payload, 
      JWT_CONFIG.SECRET, 
      { 
        expiresIn: JWT_CONFIG.EXPIRES_IN,
        issuer: 'medi-connect-api',
        audience: user.role
      }
    );
    
    console.log('JWT token generated for new user');

    res.status(201).json({ 
      success: true,
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        role: user.role
      } 
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: err.message
    });
  }
});

// @route   POST api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt for email:', req.body.email);
    console.log('Password received (excerpt):', req.body.password ? `${req.body.password.substring(0, 3)}...` : 'Missing');
    console.log('Password length:', req.body.password ? req.body.password.length : 0);
    console.log('Password charCode at 0:', req.body.password ? req.body.password.charCodeAt(0) : 'N/A');
    console.log('Full request body keys:', Object.keys(req.body));
    
    // HARDCODED CREDENTIALS CHECK (for test/recovery purposes)
    // Only use these in development!
    if (req.body.email === 'doctor@gmail.com' && req.body.password === 'doctor123') {
      console.log('Using hardcoded login for doctor');
      const token = jwt.sign(
        { 
          user: {
            id: '682dc534f88380f6ae2e4c20',
            role: 'doctor',
            email: 'doctor@gmail.com'
          } 
        }, 
        JWT_CONFIG.SECRET, 
        { 
          expiresIn: JWT_CONFIG.EXPIRES_IN,
          issuer: 'medi-connect-api',
          audience: 'doctor'
        }
      );
      
      return res.json({ 
        success: true,
        token, 
        user: { 
          id: '682dc534f88380f6ae2e4c20', 
          name: 'Doctor Demo', 
          email: 'doctor@gmail.com',
          role: 'doctor'
        } 
      });
    }
    
    if (req.body.email === 'admin@mediconnect.com' && req.body.password === 'admin123') {
      console.log('Using hardcoded login for admin');
      const token = jwt.sign(
        { 
          user: {
            id: '682dc52df88380f6ae2e4c1a',
            role: 'admin',
            email: 'admin@mediconnect.com'
          } 
        }, 
        JWT_CONFIG.SECRET, 
        { 
          expiresIn: JWT_CONFIG.EXPIRES_IN,
          issuer: 'medi-connect-api',
          audience: 'admin'
        }
      );
      
      return res.json({ 
        success: true,
        token, 
        user: { 
          id: '682dc52df88380f6ae2e4c1a', 
          name: 'Admin User', 
          email: 'admin@mediconnect.com',
          role: 'admin'
        } 
      });
    }
    
    // STANDARD LOGIN PROCESS (if hardcoded credentials don't match)
    const validation = validateUserLogin(req.body);
    const { errors, isValid } = validation;
    
    if (!isValid) {
      console.log('Login validation failed:', errors);
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const { email, password } = req.body;
    
    // Check if user exists with password field explicitly selected
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    // Log more details about the user
    console.log('User details:', {
      id: user._id,
      name: user.name,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    
    // Check password
    console.log('Password from request:', password ? 'Provided' : 'Missing');
    console.log('Stored password hash:', user.password ? user.password.substring(0, 10) + '...' : 'Missing');

    try {
      // First try regular bcrypt compare
      let isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', isMatch ? 'Yes' : 'No');
      
      // If password starts with $2a$ (bcrypt format) but doesn't match, it might be due to encoding issues
      if (!isMatch && user.password.startsWith('$2')) {
        console.log('Trying fallback password check for possible encoding issues');
        
        // Try multiple fallback methods to handle different bcrypt implementations
        
        // Method 1: Compare using compareSync
        isMatch = bcrypt.compareSync(password, user.password);
        console.log('Fallback method 1 result:', isMatch ? 'Yes' : 'No');
        
        // Method 2: If still not matching, try with a fresh hash comparison
        if (!isMatch) {
          // Extract salt from stored hash (first 29 characters in bcrypt)
          const salt = user.password.substring(0, 29);
          console.log('Extracted salt:', salt);
          
          // Use the same salt to hash the provided password
          try {
            const freshHash = await bcrypt.hash(password, salt);
            console.log('Fresh hash:', freshHash.substring(0, 10) + '...');
            console.log('Stored hash:', user.password.substring(0, 10) + '...');
            
            // Compare the hashes directly
            isMatch = freshHash === user.password;
            console.log('Fallback method 2 result:', isMatch ? 'Yes' : 'No');
          } catch (saltErr) {
            console.error('Error extracting salt or creating fresh hash:', saltErr);
          }
        }
      }
      
      if (!isMatch) {
        console.log('Password comparison failed for user:', user.email);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid password. Please try again.' 
        });
      }
      
      // Create JWT token
      const payload = { 
        user: {
          id: user.id,
          role: user.role,
          email: user.email
        } 
      };
      
      const token = jwt.sign(
        payload, 
        JWT_CONFIG.SECRET, 
        { 
          expiresIn: JWT_CONFIG.EXPIRES_IN,
          issuer: 'medi-connect-api',
          audience: user.role
        }
      );
      
      console.log('Login successful, token generated for user:', user.id);

      res.json({ 
        success: true,
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          specialization: user.specialization
        } 
      });
    } catch (bcryptErr) {
      console.error('Error during password comparison:', bcryptErr);
      return res.status(500).json({
        success: false,
        message: 'Error verifying password',
        error: bcryptErr.message
      });
    }

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: err.message
    });
  }
});

// @route   GET api/auth/verify
// @desc    Verify token and get user data
// @access  Private
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    console.log('Token verification request for user ID:', req.user.id);
    
    // User is already set by authMiddleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      console.log('User not found during token verification');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('Token verification successful for user:', user.id);
    
    res.json({
      success: true,
      user
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during token verification',
      error: err.message
    });
  }
});

// @route   POST api/auth/logout
// @desc    Logout user (client-side token invalidation)
// @access  Public
router.post('/logout', (req, res) => {
  try {
    console.log('Logout request received');
    
    // We don't actually need to do anything on the server for logout
    // since JWT tokens are stateless. The client should delete the token.
    // This endpoint is just for completing the RESTful API.
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout',
      error: err.message
    });
  }
});

module.exports = router;