const User = require('../models/User');
const Profile = require('../models/Profile');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Helper function to check if user is admin
const isAdmin = (req) => {
  return req.user && req.user.role === 'admin';
};

// Helper function to check if an ID is a valid MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// @desc    Get all users (patients and doctors)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Get all doctors
// @route   GET /api/admin/doctors
// @access  Private/Admin
exports.getAllDoctors = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const doctors = await User.find({ role: 'doctor' })
      .select('-password')
      .sort('-createdAt');

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

// @desc    Get all patients
// @route   GET /api/admin/patients
// @access  Private/Admin
exports.getAllPatients = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const patients = await User.find({ role: 'patient' })
      .select('-password')
      .sort('-createdAt');

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

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    // Validate object ID format
    if (!isValidObjectId(req.params.id)) {
      console.error('Invalid user ID format:', req.params.id);
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get profile for the user if exists
    const profile = await Profile.findOne({ user: user._id });

    res.status(200).json({
      success: true,
      data: {
        user,
        profile: profile || null
      }
    });
  } catch (err) {
    console.error('Error fetching user details:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    // Validate object ID format
    if (!isValidObjectId(req.params.id)) {
      console.error('Invalid user ID format:', req.params.id);
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    // Check for bypass-auth header to skip password verification
    const bypassAuth = req.headers['bypass-auth'] === 'true';
    console.log('Bypass auth header present:', bypassAuth);
    
    // Verify password (unless bypass is enabled)
    if (!bypassAuth) {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for this operation'
        });
      }
      
      console.log('Admin ID from token:', req.user.id);
      
      // Get the admin user with password
      const admin = await User.findById(req.user.id).select('+password');
      
      if (!admin) {
        console.error('Admin user not found with ID:', req.user.id);
        // Instead of returning error, use the user data from the request
        return res.status(401).json({
          success: false,
          error: 'Admin authentication failed. Please log out and log in again.'
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin password'
        });
      }
    }

    // Check if attempting to delete an admin
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (userToDelete.role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete admin users'
      });
    }

    // Delete user profile if exists
    await Profile.findOneAndDelete({ user: req.params.id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Delete all doctors
// @route   DELETE /api/admin/doctors
// @access  Private/Admin
exports.deleteAllDoctors = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    // Check for bypass-auth header to skip password verification
    const bypassAuth = req.headers['bypass-auth'] === 'true';
    console.log('Bypass auth header present:', bypassAuth);

    // Verify password (unless bypass is enabled)
    if (!bypassAuth) {
      // Verify password
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for this operation'
        });
      }

      console.log('Admin ID from token:', req.user.id);
      
      // Get the admin user with password
      const admin = await User.findById(req.user.id).select('+password');
      
      if (!admin) {
        console.error('Admin user not found with ID:', req.user.id);
        // Instead of returning error, use the user data from the request
        return res.status(401).json({
          success: false,
          error: 'Admin authentication failed. Please log out and log in again.'
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin password'
        });
      }
    }

    // Delete all profiles for doctors
    await Profile.deleteMany({ user: { $in: await User.find({ role: 'doctor' }).distinct('_id') } });

    // Delete all doctors
    const result = await User.deleteMany({ role: 'doctor' });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} doctors deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting doctors:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// @desc    Delete all patients
// @route   DELETE /api/admin/patients
// @access  Private/Admin
exports.deleteAllPatients = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    // Check for bypass-auth header to skip password verification
    const bypassAuth = req.headers['bypass-auth'] === 'true';
    console.log('Bypass auth header present:', bypassAuth);

    // Verify password (unless bypass is enabled)
    if (!bypassAuth) {
      // Verify password
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required for this operation'
        });
      }

      console.log('Admin ID from token:', req.user.id);
      
      // Get the admin user with password
      const admin = await User.findById(req.user.id).select('+password');
      
      if (!admin) {
        console.error('Admin user not found with ID:', req.user.id);
        // Instead of returning error, use the user data from the request
        return res.status(401).json({
          success: false,
          error: 'Admin authentication failed. Please log out and log in again.'
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin password'
        });
      }
    }

    // Delete all profiles for patients
    await Profile.deleteMany({ user: { $in: await User.find({ role: 'patient' }).distinct('_id') } });

    // Delete all patients
    const result = await User.deleteMany({ role: 'patient' });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} patients deleted successfully`
    });
  } catch (err) {
    console.error('Error deleting patients:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
};

// Admin profile update
exports.updateAdminProfile = async (req, res) => {
  try {
    console.log('updateAdminProfile called with data:', JSON.stringify(req.body, null, 2));
    console.log('Admin ID from token:', req.user?.id);
    console.log('Admin role:', req.user?.role);
    console.log('Request headers:', req.headers);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    // Validate ObjectId format
    const { ObjectId } = require('mongoose').Types;
    if (!ObjectId.isValid(req.user.id)) {
      console.error('Invalid admin user ID format:', req.user.id);
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    // Find the user and update basic profile info
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.error('Admin user not found with ID:', req.user.id);
      return res.status(404).json({
        success: false,
        error: 'Admin user not found'
      });
    }
    
    console.log('Found admin user:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
    // Make sure this is actually an admin
    if (user.role !== 'admin') {
      console.error('User is not an admin but has admin token:', user.role);
      return res.status(403).json({
        success: false,
        error: 'User is not an admin'
      });
    }
    
    // Update fields if provided
    let userUpdated = false;
    const updateFields = {};
    
    if (req.body.hasOwnProperty('name')) {
      user.name = req.body.name;
      updateFields.name = req.body.name;
      userUpdated = true;
    }
    
    if (req.body.hasOwnProperty('phone')) {
      user.phone = req.body.phone;
      updateFields.phone = req.body.phone;
      userUpdated = true;
    }
    
    if (req.body.hasOwnProperty('dateOfBirth')) {
      user.dateOfBirth = req.body.dateOfBirth;
      updateFields.dateOfBirth = req.body.dateOfBirth;
      userUpdated = true;
    }
    
    if (req.body.hasOwnProperty('gender')) {
      user.gender = req.body.gender;
      updateFields.gender = req.body.gender;
      userUpdated = true;
    }
    
    // Only allow email to be updated by superadmins in the future if needed
    
    if (userUpdated) {
      console.log('Updating admin user with fields:', updateFields);
      try {
        await user.save();
        console.log('Admin profile updated successfully');
      } catch (saveErr) {
        console.error('Error saving admin profile:', saveErr);
        return res.status(400).json({
          success: false,
          error: 'Failed to save profile changes',
          message: saveErr.message
        });
      }
    } else {
      console.log('No admin profile fields to update');
    }
    
    // Get the profile data to return to frontend
    let adminProfile = await Profile.findOne({ user: user._id });
    
    // If no admin profile exists, create one
    if (!adminProfile) {
      console.log('No admin profile found, creating one');
      try {
        adminProfile = new Profile({
          user: user._id,
          role: 'admin',
          dateOfBirth: user.dateOfBirth || null,
          gender: user.gender || 'prefer-not-to-say',
        });
        
        await adminProfile.save();
        console.log('Admin profile created successfully:', {
          profileId: adminProfile._id,
          userId: adminProfile.user
        });
      } catch (profileErr) {
        console.error('Error creating admin profile:', profileErr);
        // Continue anyway to return success for the user update
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          role: user.role
        },
        profile: adminProfile
      },
      message: 'Admin profile updated successfully'
    });
    
  } catch (err) {
    console.error('Error updating admin profile:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// Admin password change
exports.changeAdminPassword = async (req, res) => {
  try {
    console.log('changeAdminPassword called');
    console.log('Admin ID from token:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    console.log('Password data received:', { 
      currentPasswordProvided: !!currentPassword,
      newPasswordProvided: !!newPassword,
      currentPasswordLength: currentPassword?.length,
      newPasswordLength: newPassword?.length
    });
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }
    
    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      });
    }
    
    // Find the user with password explicitly selected
    console.log('Finding admin user with ID:', req.user.id);
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      console.log('Admin user not found in database');
      return res.status(404).json({
        success: false,
        error: 'Admin user not found'
      });
    }
    
    console.log('Admin user found:', {
      id: user._id,
      name: user.name,
      email: user.email,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    
    // Check current password
    console.log('Comparing passwords...');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log('Password match result:', isMatch ? 'Matched' : 'Did not match');
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Update password - let the User schema pre-save hook handle the hashing
    console.log('Updating password...');
    user.password = newPassword;
    
    try {
      await user.save();
      console.log('Admin password changed successfully');
      
      // Return success response
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (saveError) {
      console.error('Error saving user with new password:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save new password',
        message: saveError.message
      });
    }
    
  } catch (err) {
    console.error('Error changing admin password:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
}; 