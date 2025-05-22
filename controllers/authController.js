const User = require('../models/User');
const { validateUserRegistration, validateUserLogin } = require('../utils/validation');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Token generation helper with enhanced security
const generateToken = (user) => {
  // Get the secret from environment or config
  const secret = process.env.JWT_SECRET || JWT_CONFIG.SECRET;
  const expiresIn = process.env.JWT_EXPIRE || JWT_CONFIG.EXPIRES_IN || '30d';
  
  console.log('Generating token for user:', user._id);
  console.log('Secret configured:', secret ? 'Yes' : 'No');
  
  return jwt.sign(
    { 
      user: { 
        id: user._id,
        role: user.role,
        email: user.email
      } 
    },
    secret,
    { 
      expiresIn,
      issuer: 'medi-connect-api',
      audience: user.role 
    }
  );
};

// @desc    Register User (Doctor or Patient)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { error } = validateUserRegistration(req.body);
  if (error) {
    logger.warn('Registration validation failed', { errors: error.details });
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    });
  }

  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email: req.body.email });
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Prepare user data based on role
    const userData = {
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender
    };

    if (req.body.role === 'doctor') {
      userData.specialization = req.body.specialization;
    } else if (req.body.role === 'patient') {
      userData.height = req.body.height;
      userData.weight = req.body.weight;
      userData.emergencyContact = req.body.emergencyContact || {};
    }

    const newUser = await User.create(userData);
    const token = generateToken(newUser);

    logger.info('New user registered', { userId: newUser._id, role: newUser.role });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        specialization: newUser.specialization,
        dateOfBirth: newUser.dateOfBirth,
        gender: newUser.gender
      },
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });

  } catch (err) {
    logger.error('Registration error', { error: err.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Registration failed',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Login User
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { error } = validateUserLogin(req.body);
  if (error) {
    logger.warn('Login validation failed', { errors: error.details });
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details.map(err => ({
        field: err.path[0],
        message: err.message
      }))
    });
  }

  try {
    console.log('Login attempt for email:', req.body.email);
    
    // Make sure to explicitly select password field
    const user = await User.findOne({ email: req.body.email }).select('+password +loginAttempts +lockUntil');
    
    console.log('User found:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', {
        id: user._id,
        name: user.name,
        role: user.role,
        hasPassword: !!user.password,
        passwordLength: user.password?.length
      });
    }
    
    // Account lock check
    if (user?.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      logger.warn('Locked account login attempt', { email: req.body.email });
      return res.status(403).json({
        success: false,
        error: `Account temporarily locked. Try again in ${remainingTime} minutes.`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    if (!user) {
      console.log('Login failed: User not found');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    console.log('Password from request:', req.body.password ? '(provided)' : '(missing)');
    console.log('Stored password hash:', user.password ? user.password.substring(0, 10) + '...' : '(missing)');
    
    // Check password with explicit error handling
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(req.body.password, user.password);
      console.log('Password match result:', passwordMatch ? 'Matched' : 'Did not match');
    } catch (bcryptErr) {
      console.error('Error during password comparison:', bcryptErr);
      return res.status(500).json({ 
        success: false, 
        error: 'Error verifying password',
        code: 'PASSWORD_VERIFICATION_ERROR',
        message: bcryptErr.message
      });
    }
    
    if (!passwordMatch) {
      // Increment failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30*60*1000; // Lock for 30 minutes
        user.loginAttempts = 0;
        logger.warn('Account locked due to failed attempts', { email: req.body.email });
      }
      await user.save();
      
      logger.warn('Failed login attempt', { email: req.body.email });
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0 || user.lockUntil) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    const token = generateToken(user);
    logger.info('User logged in', { userId: user._id });
    console.log('Login successful, token generated. User role:', user.role);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialization: user.specialization,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender
      },
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });

  } catch (err) {
    console.error('Login error details:', err);
    logger.error('Login error', { error: err.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Login failed',
      code: 'SERVER_ERROR',
      message: err.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      logger.warn('User not found during profile fetch', { userId: req.user.id });
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    logger.debug('Profile fetched', { userId: user._id });
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialization: user.specialization,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        emergencyContact: user.emergencyContact,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    logger.error('Profile fetch error', { error: err.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch profile',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // In a real implementation, you might:
    // 1. Add token to a blacklist
    // 2. Track logout event
    logger.info('User logged out', { userId: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err) {
    logger.error('Logout error', { error: err.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Logout failed',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Verify token validity
// @route   GET /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    logger.error('Token verification error', { error: err.stack });
    res.status(500).json({ 
      success: false, 
      error: 'Token verification failed',
      code: 'SERVER_ERROR'
    });
  }
};