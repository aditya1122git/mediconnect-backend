// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const JWT_CONFIG = require('./config/jwtConfig');

// Load env vars
dotenv.config();

// Connect to database
console.log('Initializing database connection...');
connectDB()
  .then(success => {
    if (success) {
      startServer();
    } else {
      console.error('WARNING: Server starting without database connection. Some features may not work!');
      // Start the server anyway, but with a warning
      startServer();
    }
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

// Route files
const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const profileRoutes = require('./routes/profileRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Body parser
app.use(express.json({ limit: '1mb' })); // Set limit to prevent large payload attacks
app.use(express.urlencoded({ extended: false }));

// CORS Configuration - UPDATED AND FIXED
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      // Current frontend URL
      'https://mediconnect-frontend2-git-main-adityas-projects-93c7ad04.vercel.app',
      // Previous frontend URL (keep for backup)
      'https://mediconnect-frontend2-agj677dvs-adityas-projects-93c7ad04.vercel.app',
      // Production domain
      'https://mediconnect-frontend2.vercel.app',
      // Local development URLs
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:5173', // Vite default
      // Environment variable
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed origin: ${origin}`);
      return callback(null, true);
    }
    
    // Check if origin matches Vercel pattern for any preview deployments
    const vercelPattern = /^https:\/\/mediconnect-frontend2.*\.vercel\.app$/;
    if (vercelPattern.test(origin)) {
      console.log(`✅ CORS allowed Vercel origin: ${origin}`);
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log(`❌ CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-auth-token',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  optionsSuccessStatus: 200 // For legacy browser support
};

// Enable CORS with proper configuration
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Test route to check server status
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// CORS test route for debugging
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    method: req.method,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
});

// Create a direct JWT token generator helper function
function generateDirectLoginToken(user) {
  // Ensure the token is created with the same secret and config as the auth middleware expects
  const secret = JWT_CONFIG.SECRET;
    
  const payload = {
    user: {
      id: user.id,      
      role: user.role,
      email: user.email
    }
  };
    
  return jwt.sign(
    payload,
    secret,
    {
      expiresIn: JWT_CONFIG.EXPIRES_IN || '30d',
      issuer: 'medi-connect-api',
      audience: user.role
    }
  );
}

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

// Handle hot-update files
app.get('*.hot-update.json', (req, res) => res.status(404).end());

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, '../frontend', 'build', 'index.html'))
  );
}

// Function to start the server
function startServer() {
  // Use PORT environment variable for Render deployment, fallback to 5002
  const PORT = process.env.PORT || 5002;
    
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    console.log(`🌐 CORS enabled for frontend URLs`);
    console.log(`🔍 Test CORS at: http://localhost:${PORT}/api/cors-test`);
  });
    
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.log(`❌ Error: ${err.message}`.red);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
}
