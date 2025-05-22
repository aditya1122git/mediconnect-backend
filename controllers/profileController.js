const Profile = require('../models/Profile');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get My Profile
exports.getProfile = async (req, res) => {
  try {
    console.log('getProfile controller called');
    console.log('User ID:', req.user?.id);
    console.log('User role:', req.user?.role);
    
    if (!req.user || !req.user.id) {
      console.log('No user in request');
      return res.status(401).json({ 
        success: false, 
        error: 'User not authenticated' 
      });
    }
    
    console.log('Finding profile for user:', req.user.id);
    let profile = await Profile.findOne({ user: req.user.id })
      .populate('user', ['name', 'email', 'role', 'phone']);
    
    console.log('Profile found:', profile ? 'Yes' : 'No');

    // If no profile found, create one from user data
    if (!profile) {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
      }
      
      // Create profile from user data
      const profileData = {
        user: user._id,
        role: user.role,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender
      };
      
      // Add role-specific fields
      if (user.role === 'doctor') {
        profileData.specialization = user.specialization;
        profileData.experience = '';
        profileData.about = '';
        profileData.qualifications = [];
      } else if (user.role === 'patient') {
        profileData.height = user.height;
        profileData.weight = user.weight;
        profileData.emergencyContact = user.emergencyContact;
        profileData.conditions = [];
        profileData.allergies = [];
      } else if (user.role === 'admin') {
        // Admin user profile is simple
        console.log('Creating admin profile for user:', user._id);
      }
      
      console.log('Creating new profile for user:', user._id);
      profile = await Profile.create(profileData);
      profile = await profile.populate('user', ['name', 'email', 'role', 'phone']);
      console.log('New profile created with ID:', profile._id);
    }

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (err) {
    console.error('Error in getProfile:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('updateProfile called with data:', JSON.stringify(req.body, null, 2));
    console.log('User ID from token:', req.user?.id);
    console.log('User role:', req.user?.role);
    console.log('Request path:', req.originalUrl);
    
    // Special handling for admin users
    const isAdminRoute = req.originalUrl.includes('/admin/profile');
    if (isAdminRoute) {
      console.log('Admin profile update detected');
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin only.'
        });
      }
    }
    
    // Validate qualifications if present
    if (req.body.qualifications && Array.isArray(req.body.qualifications)) {
      for (let qualification of req.body.qualifications) {
        if (!qualification.degree || !qualification.institution) {
          return res.status(400).json({
            success: false,
            error: 'Degree and Institution are required for qualifications'
          });
        }
      }
    }
    
    // Find the profile and check if email is being changed
    console.log('Finding profile to update');
    const existingProfile = await Profile.findOne({ user: req.user.id })
      .populate('user', ['name', 'email', 'role', 'phone']);
      
    if (!existingProfile) {
      console.log('No profile found, creating a new one');
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    // Only block if email is different from the current one
    if (req.body.email && existingProfile.user.email && req.body.email !== existingProfile.user.email) {
      return res.status(400).json({
        success: false,
        error: 'Email cannot be changed'
      });
    }
    
    // Remove email from request body to prevent any accidental updates
    if (req.body.email) {
      delete req.body.email;
    }
    
    console.log('Existing profile found, preparing update object');
    
    // Create an update object with only the fields actually provided in the request
    const profileUpdateFields = {};
    
    // Only add fields to the update object if they exist in the request body
    if (req.body.hasOwnProperty('dateOfBirth')) profileUpdateFields.dateOfBirth = req.body.dateOfBirth;
    if (req.body.hasOwnProperty('gender')) profileUpdateFields.gender = req.body.gender;
    if (req.body.hasOwnProperty('height')) profileUpdateFields.height = req.body.height;
    if (req.body.hasOwnProperty('weight')) profileUpdateFields.weight = req.body.weight;
    if (req.body.hasOwnProperty('conditions')) profileUpdateFields.conditions = req.body.conditions;
    if (req.body.hasOwnProperty('allergies')) profileUpdateFields.allergies = req.body.allergies;
    
    // Doctor specific fields
    if (req.body.hasOwnProperty('specialization')) profileUpdateFields.specialization = req.body.specialization;
    if (req.body.hasOwnProperty('experience')) profileUpdateFields.experience = req.body.experience;
    if (req.body.hasOwnProperty('about')) profileUpdateFields.about = req.body.about;
    if (req.body.hasOwnProperty('qualifications')) profileUpdateFields.qualifications = req.body.qualifications;
    
    // Handle emergency contact - only add if at least one field is provided
    if (req.body.emergencyContact) {
      profileUpdateFields.emergencyContact = {};
      if (req.body.emergencyContact.hasOwnProperty('name')) {
        profileUpdateFields.emergencyContact.name = req.body.emergencyContact.name;
      } else if (existingProfile.emergencyContact) {
        profileUpdateFields.emergencyContact.name = existingProfile.emergencyContact.name;
      }
      
      if (req.body.emergencyContact.hasOwnProperty('relationship')) {
        profileUpdateFields.emergencyContact.relationship = req.body.emergencyContact.relationship;
      } else if (existingProfile.emergencyContact) {
        profileUpdateFields.emergencyContact.relationship = existingProfile.emergencyContact.relationship;
      }
      
      if (req.body.emergencyContact.hasOwnProperty('phone')) {
        profileUpdateFields.emergencyContact.phone = req.body.emergencyContact.phone;
      } else if (existingProfile.emergencyContact) {
        profileUpdateFields.emergencyContact.phone = existingProfile.emergencyContact.phone;
      }
    }

    console.log('Profile update fields:', JSON.stringify(profileUpdateFields, null, 2));
    
    // Only proceed with profile update if there are fields to update
    let profile;
    if (Object.keys(profileUpdateFields).length > 0) {
      try {
        // Ensure required fields are maintained for doctors
        if (existingProfile.role === 'doctor' && profileUpdateFields.hasOwnProperty('specialization') && !profileUpdateFields.specialization) {
          // If trying to set specialization to empty and user is a doctor, this would fail validation
          // So we maintain the existing value
          profileUpdateFields.specialization = existingProfile.specialization;
        }
        
        console.log('About to update profile with:', JSON.stringify(profileUpdateFields, null, 2));
        
        // First try to get the document we want to update
        const profileToUpdate = await Profile.findOne({ user: req.user.id });
        
        if (!profileToUpdate) {
          return res.status(404).json({
            success: false,
            error: 'Profile not found when trying to update'
          });
        }
        
        // Update each field individually to avoid validation issues
        Object.keys(profileUpdateFields).forEach(key => {
          profileToUpdate[key] = profileUpdateFields[key];
        });
        
        // Save with validation
        await profileToUpdate.save();
        
        // Reload with populated user
        profile = await Profile.findOne({ user: req.user.id })
          .populate('user', ['name', 'email', 'role', 'phone']);
        
        if (!profile) {
          console.error('Profile update failed - could not find profile after save');
          return res.status(500).json({
            success: false,
            error: 'Failed to update profile'
          });
        }
        
        console.log('Profile updated successfully');
      } catch (profileErr) {
        console.error('Error updating profile:', profileErr);
        
        // More detailed error reporting
        let errorMessage = 'Failed to update profile document';
        
        if (profileErr.name === 'ValidationError') {
          errorMessage = 'Validation error: ' + Object.values(profileErr.errors)
            .map(e => e.message)
            .join(', ');
        }
        
        return res.status(400).json({
          success: false,
          error: errorMessage,
          details: profileErr.message
        });
      }
    } else {
      console.log('No profile fields to update');
    }
    
    // Update user data
    console.log('Updating user document with profile data');
    try {
      const user = await User.findById(req.user.id);
      if (user) {
        // Only update user fields if they exist in the request body
        let userUpdated = false;
        
        if (req.body.hasOwnProperty('name')) {
          user.name = req.body.name;
          userUpdated = true;
        }
        
        if (req.body.hasOwnProperty('phone')) {
          user.phone = req.body.phone;
          userUpdated = true;
        }
        
        if (req.body.hasOwnProperty('specialization')) {
          user.specialization = req.body.specialization;
          userUpdated = true;
        }
        
        if (req.body.hasOwnProperty('dateOfBirth')) {
          user.dateOfBirth = req.body.dateOfBirth;
          userUpdated = true;
        }
        
        if (req.body.hasOwnProperty('gender')) {
          user.gender = req.body.gender;
          userUpdated = true;
        }
        
        if (req.body.hasOwnProperty('height')) {
          user.height = req.body.height;
          userUpdated = true;
        }
        
        if (req.body.hasOwnProperty('weight')) {
          user.weight = req.body.weight;
          userUpdated = true;
        }
        
        // Update emergency contact if present
        if (req.body.emergencyContact) {
          if (!user.emergencyContact) user.emergencyContact = {};
          
          if (req.body.emergencyContact.hasOwnProperty('name')) {
            user.emergencyContact.name = req.body.emergencyContact.name;
            userUpdated = true;
          }
          
          if (req.body.emergencyContact.hasOwnProperty('relationship')) {
            user.emergencyContact.relationship = req.body.emergencyContact.relationship;
            userUpdated = true;
          }
          
          if (req.body.emergencyContact.hasOwnProperty('phone')) {
            user.emergencyContact.phone = req.body.emergencyContact.phone;
            userUpdated = true;
          }
        }
        
        if (userUpdated) {
          await user.save();
          console.log('User document updated successfully');
        } else {
          console.log('No user fields to update');
        }
      } else {
        console.error('User not found when updating user document');
      }
    } catch (userErr) {
      console.error('Error updating user document:', userErr);
      return res.status(500).json({
        success: false,
        error: 'Failed to update user document',
        message: userErr.message
      });
    }

    // Get the updated profile to return in response
    const updatedProfile = await Profile.findOne({ user: req.user.id })
      .populate('user', ['name', 'email', 'role', 'phone']);

    res.status(200).json({
      success: true,
      data: updatedProfile
    });

  } catch (err) {
    console.error('Error in updateProfile:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    console.log('changePassword called for user ID:', req.user.id);
    console.log('User role:', req.user.role);
    
    // Check if required fields are present
    if (!req.body.currentPassword || !req.body.newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'Current password and new password are required' 
      });
    }

    // Find the user with password explicitly selected
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
      console.log('User not found for password change:', req.user.id);
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    console.log('User found, verifying current password');
    console.log('User details:', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length
    });
    console.log('Current password from request:', req.body.currentPassword ? '(provided)' : '(missing)');
    console.log('Stored password hash:', user.password ? user.password.substring(0, 10) + '...' : '(missing)');

    // Check current password
    const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
    console.log('Password match result:', isMatch ? 'Matched' : 'Did not match');
    
    if (!isMatch) {
      console.log('Current password verification failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Current password is incorrect' 
      });
    }

    console.log('Current password correct, updating with new password');
    
    // Directly set the new password
    user.password = req.body.newPassword;
    
    console.log('New password set, saving to database');
    // Save the user (password will be hashed by the pre-save hook)
    try {
      await user.save();
      console.log('Password updated successfully');
      
      res.status(200).json({
        success: true,
        message: 'Password updated successfully'
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
    console.error('Error changing password:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: err.message 
    });
  }
};