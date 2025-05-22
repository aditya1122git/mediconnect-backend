const express = require('express');
const router = express.Router();
const {
  getHealthRecords,
  getHealthRecord,
  addHealthRecord,
  updateHealthRecord,
  deleteHealthRecord
} = require('../controllers/healthController');
const { getDashboardData } = require('../controllers/dashboardController');
const auth = require('../middlewares/authMiddleware');

// All routes protected by auth middleware
router.use(auth);

// GET /api/health
router.get('/', getHealthRecords);

// GET /api/health/records
router.get('/records', getHealthRecords);

// GET /api/health/dashboard
router.get('/dashboard', getDashboardData);

// POST /api/health/record
router.post('/record', addHealthRecord);

// PUT /api/health/records/:id
router.put('/records/:id', updateHealthRecord);

// DELETE /api/health/records/:id
router.delete('/records/:id', deleteHealthRecord);

// GET /api/health/:id
router.get('/:id', getHealthRecord);

// POST /api/health (doctors only)
router.post('/', auth, (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can create records' });
  }
  next();
}, addHealthRecord);

// PUT /api/health/:id (doctors only)
router.put('/:id', (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can update records' });
  }
  next();
}, updateHealthRecord);

// DELETE /api/health/:id (doctors only)
router.delete('/:id', (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can delete records' });
  }
  next();
}, deleteHealthRecord);

module.exports = router;