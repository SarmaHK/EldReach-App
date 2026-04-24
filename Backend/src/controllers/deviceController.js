const deviceService = require('../services/deviceService');

/**
 * @desc    Create or update a device
 * @route   POST /api/devices
 */
const upsertDevice = async (req, res) => {
  try {
    const { nodeId, gatewayId, roomId, sensors } = req.body;

    if (!nodeId) {
      return res.status(400).json({
        status: 'error',
        message: 'nodeId is required',
      });
    }

    const device = await deviceService.updateDevice(req.body);

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

/**
 * @desc    Register a new device via QR scan
 * @route   POST /api/devices/register
 */
const registerDevice = async (req, res) => {
  try {
    const { deviceId, gatewayId, roomId } = req.body;

    if (!deviceId || !gatewayId) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceId and gatewayId are required',
      });
    }

    const { device, isNew } = await deviceService.registerDevice({ deviceId, gatewayId, roomId });

    if (!isNew) {
      return res.status(409).json({
        status: 'error',
        message: 'Device already registered',
        data: device,
      });
    }

    res.status(201).json({
      status: 'success',
      data: device,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to register device',
    });
  }
};

module.exports = {
  upsertDevice,
  getDevices,
  registerDevice,
};
