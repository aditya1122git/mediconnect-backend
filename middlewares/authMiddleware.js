const jwt = require('jsonwebtoken');
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
          message: `Access denied. Requires ${role} role`,
          code: 'ROLE_REQUIRED'
        });
      }
      next();
    });
  };
};

module.exports = authMiddleware;