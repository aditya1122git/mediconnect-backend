const HealthRecord = require('../models/HealthRecord');
const asyncHandler = require('../middlewares/async');

// @desc    Get dashboard data
// @route   GET /api/dashboard
// @access  Private
exports.getDashboardData = asyncHandler(async (req, res, next) => {
  // Get recent health records (last 5)
  const recentRecords = await HealthRecord.find({ user: req.user.id })
    .populate('doctor', 'name specialization')
    .sort('-date')
    .limit(5);

  // Get the latest record for each health metric
  const latestRecord = await HealthRecord.findOne({ user: req.user.id })
    .sort('-date')
    .lean();

  // Prepare summary with latest values instead of averages
  const summary = latestRecord ? {
    bloodPressure: latestRecord.bloodPressure,
    heartRate: latestRecord.heartRate,
    weight: latestRecord.weight,
    glucoseLevel: latestRecord.glucoseLevel
  } : {
    bloodPressure: { systolic: null, diastolic: null },
    heartRate: null,
    weight: null,
    glucoseLevel: null
  };

  res.status(200).json({
    success: true,
    data: {
      recentEntries: recentRecords,
      summary
    }
  });
});