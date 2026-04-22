const deviceService = require('../services/deviceService');

/**
 * @desc    Create or update a device
 * @route   POST /api/devices
 */
const upsertDevice = async (req, res) => {
  try {
    const { deviceId, status, sensors } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceId is required',
      });
    }

    const device = await deviceService.updateDeviceData({ deviceId, status, sensors });

    res.status(200).json({
      status: 'success',
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upsert device',
    });
  }
};

/**
 * @desc    Get all devices
 * @route   GET /api/devices
 */
const getDevices = async (req, res) => {
  try {
    const devices = await deviceService.getAllDevices();

    res.status(200).json({
      status: 'success',
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch devices',
    });
  }
};

module.exports = {
  upsertDevice,
  getDevices,
};
