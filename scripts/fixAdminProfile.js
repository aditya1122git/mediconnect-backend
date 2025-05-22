const mongoose = require('mongoose');
const User = require('../models/User');
const Profile = require('../models/Profile');

// MongoDB connection URI 
const mongoUri = 'mongodb+srv://mediconnect:mediconnect123@cluster0.emycwd5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function fixAdminProfile() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB successfully');
    console.log('Database:', mongoose.connection.db.databaseName);

    // ---- STEP 1: Find admin user(s) ----
    const adminUsers = await User.find({ role: 'admin' });
    
    if (adminUsers.length === 0) {
      console.error('No admin users found in database');
      return;
    }
    
    console.log(`Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach((admin, index) => {
      console.log(`Admin ${index + 1}:`, {
        id: admin._id,
        name: admin.name,
        email: admin.email
      });
    });
    
    // ---- STEP 2: Check for admin profiles ----
    console.log('\nChecking for admin profiles...');
    for (const admin of adminUsers) {
      const profile = await Profile.findOne({ user: admin._id });
      
      if (!profile) {
        console.log(`No profile found for admin user ${admin._id} (${admin.email})`);
        
        // Create a profile for this admin
        console.log(`Creating profile for admin user ${admin._id}`);
        const newProfile = new Profile({
          user: admin._id,
          role: 'admin',
          dateOfBirth: admin.dateOfBirth || null,
          gender: admin.gender || 'prefer-not-to-say',
        });
        
        await newProfile.save();
        console.log('Admin profile created successfully:', {
          profileId: newProfile._id,
          userId: newProfile.user
        });
      } else {
        console.log(`Profile exists for admin ${admin._id}:`, {
          profileId: profile._id
        });
      }
    }
    
    // ---- STEP 3: Check for ID mismatch with problematic ID ----
    const problematicId = '682dc52df88380f6ae2e4c1a'; // ID from error logs
    const userWithProblematicId = await User.findById(problematicId);
    
    if (userWithProblematicId) {
      console.log('\nFound user with the problematic ID from error logs:', {
        id: userWithProblematicId._id,
        name: userWithProblematicId.name,
        email: userWithProblematicId.email,
        role: userWithProblematicId.role
      });
      
      if (userWithProblematicId.role !== 'admin') {
        console.log(`WARNING: User with ID ${problematicId} exists but is not an admin (role: ${userWithProblematicId.role})`);
        console.log('This may be causing confusion in your frontend');
      }
    } else {
      console.log(`\nNo user found with the problematic ID ${problematicId}`);
      console.log('This is likely causing errors in your frontend when trying to update the admin profile');
    }
    
    // ---- STEP 4: Display JWT debugging info ----
    console.log('\nDebugging JWT tokens:');
    console.log(`
To debug your JWT token in the browser:
1. Open your browser's developer tools (F12 or right-click -> Inspect)
2. Go to the "Console" tab 
3. Copy and paste this code:

// Decode JWT token from localStorage
function debugToken() {
  const token = localStorage.getItem('token');
  if (!token) return 'No token found';
  
  try {
    const parts = token.split('.');
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    
    console.log('Full decoded token:', payload);
    if (payload.user && payload.user.id) {
      console.log('User ID in token:', payload.user.id);
    }
    return payload;
  } catch (err) {
    return 'Error decoding token: ' + err.message;
  }
}

debugToken();
`);
    
    // ---- STEP 5: Display all admin routes for verification ----
    console.log('\nAdmin routes that should be working:');
    console.log('- GET /api/admin/profile - Get admin profile');
    console.log('- PUT /api/admin/profile - Update admin profile');
    console.log('- PUT /api/admin/change-password - Change admin password');
    console.log('- GET /api/admin/users - Get all users');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

fixAdminProfile(); 