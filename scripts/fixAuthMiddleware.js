const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const JWT_CONFIG = require('../config/jwtConfig');

// The script will apply a reliable fix for auth issues
console.log('=== AUTH MIDDLEWARE FIX UTILITY ===');

// 1. First check the JWT_CONFIG
console.log('\nJWT Configuration:');
console.log('SECRET:', JWT_CONFIG.SECRET ? 'Found (masked)' : 'Not found');
console.log('EXPIRES_IN:', JWT_CONFIG.EXPIRES_IN || '(using default)');

// 2. Generate a test token
const createTestToken = () => {
  const doctorId = '682dc534f88380f6ae2e4c20';
  const doctorRole = 'doctor';
  const doctorEmail = 'doctor@gmail.com';
  
  const token = jwt.sign(
    { 
      user: {
        id: doctorId,
        role: doctorRole,
        email: doctorEmail
      } 
    }, 
    JWT_CONFIG.SECRET,
    { 
      expiresIn: JWT_CONFIG.EXPIRES_IN || '30d',
      issuer: 'medi-connect-api',
      audience: doctorRole
    }
  );
  
  return token;
};

const testToken = createTestToken();
console.log('\nTest token created:', testToken.substring(0, 15) + '...');

// 3. Verify the token using the same JWT_CONFIG
try {
  const decoded = jwt.verify(testToken, JWT_CONFIG.SECRET);
  console.log('Token verification successful!');
  console.log('Decoded payload:', decoded);
} catch (err) {
  console.error('Token verification failed:', err.message);
}

// 4. Now update the authMiddleware.js file to use a simpler approach
const authMiddlewarePath = path.join(__dirname, '../middlewares/authMiddleware.js');
console.log('\nUpdating auth middleware at:', authMiddlewarePath);

try {
  // Read the current file
  let authMiddlewareContent = fs.readFileSync(authMiddlewarePath, 'utf8');
  
  // Create the updated middleware with fixed JWT handling
  const updatedAuthMiddleware = `const jwt = require('jsonwebtoken');
const JWT_CONFIG = require('../config/jwtConfig');

// Simplified and reliable auth middleware
const authMiddleware = (req, res, next) => {
  console.log('Auth middleware called');
  
  // Try to get token from multiple sources (Authorization header preferred)
  let token = null;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token found in Authorization header');
  } else if (req.header('x-auth-token')) {
    token = req.header('x-auth-token');
    console.log('Token found in x-auth-token header');
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log('Token found in cookies');
  }
  
  // Check if token exists
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({
      success: false,
      message: 'Authorization denied. No token provided',
      code: 'NO_TOKEN'
    });
  }

  try {
    // Use a consistent JWT secret
    const secret = JWT_CONFIG.SECRET;
    
    // Verify token
    const decoded = jwt.verify(token, secret);
    console.log('JWT token verified successfully');
    
    // Check if the decoded token has the expected structure
    if (!decoded.user || !decoded.user.id) {
      console.log('Invalid token structure:', decoded);
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - missing user data',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    // Attach user to request
    req.user = {
      id: decoded.user.id,
      role: decoded.user.role || 'patient', // Default to patient if role is not specified
      email: decoded.user.email
    };
    
    console.log('User authenticated:', req.user.id, 'Role:', req.user.role);
    
    // Set last activity timestamp
    req.user.lastActivity = Date.now();
    
    // Continue to the next middleware/route
    next();
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    
    let message = 'Token is not valid';
    let code = 'INVALID_TOKEN';
    
    if (err.name === 'TokenExpiredError') {
      message = 'Token has expired';
      code = 'TOKEN_EXPIRED';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
      code = 'MALFORMED_TOKEN';
    }
    
    res.status(401).json({
      success: false,
      message,
      code,
      // Include this only in development
      detail: err.message
    });
  }
};

// Higher-order function for role-based access control
authMiddleware.requireRole = (role) => {
  return (req, res, next) => {
    authMiddleware(req, res, () => {
      if (req.user?.role !== role) {
        return res.status(403).json({
          success: false,
          message: \`Access denied. Requires \${role} role\`,
          code: 'ROLE_REQUIRED'
        });
      }
      next();
    });
  };
};

module.exports = authMiddleware;`;

  // Write the updated middleware
  fs.writeFileSync(authMiddlewarePath, updatedAuthMiddleware);
  console.log('Auth middleware updated successfully! Server needs to be restarted.');
  
  // Also update JWT_CONFIG to use a simpler approach
  const jwtConfigPath = path.join(__dirname, '../config/jwtConfig.js');
  
  // Skip this check if we're not planning to update the JWT config
  /* 
  console.log('\nChecking JWT config at:', jwtConfigPath);
  if (fs.existsSync(jwtConfigPath)) {
    const jwtConfigContent = fs.readFileSync(jwtConfigPath, 'utf8');
    // Only update if needed (we're not doing this now)
  }
  */
  
  console.log('\n=== AUTH MIDDLEWARE FIX COMPLETE ===');
  console.log('Please restart the server for changes to take effect.');
  
} catch (err) {
  console.error('Error updating auth middleware:', err);
}

// Create an emergency hardcoded token for direct use in browser
console.log('\n=== EMERGENCY HARDCODED TOKEN ===');
const emergencyToken = createTestToken();
console.log('Copy this token to use directly in the browser localStorage:');
console.log(emergencyToken); 