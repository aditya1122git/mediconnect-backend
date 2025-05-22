// Default JWT config for development
// In production, this should be set via environment variables

const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || 'mediconnect_secure_jwt_secret_12345',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
};

module.exports = JWT_CONFIG; 