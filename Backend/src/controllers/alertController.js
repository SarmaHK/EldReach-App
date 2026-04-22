const alertService = require('../services/alertService');

/**
 * @desc    Get all alerts
 * @route   GET /api/alerts
 */
const getAlerts = async (req, res) => {
  try {
    const alerts = await alertService.getAllAlerts();

    res.status(200).json({
      status: 'success',
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch alerts',
    });
  }
};

module.exports = {
  getAlerts,
};
