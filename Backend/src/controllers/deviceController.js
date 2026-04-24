const deviceService = require('../services/deviceService');

/**
 * @desc    Handle incoming ESP32 telemetry data
 * @route   POST /api/devices
 */
const handleIncomingTelemetry = async (req, res) => {
  try {
    const { deviceId, gatewayId, status, timestamp, sensors } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required',
      });
    }

    console.log("Incoming:", req.body);
    console.log(`[DeviceController] Incoming telemetry from gateway ${gatewayId} for device ${deviceId}`);
    console.log(`[DeviceController] Payload:`, JSON.stringify(req.body));

    await deviceService.handleIncomingData(req.body);

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error('[DeviceController] handleIncomingTelemetry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process telemetry',
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
    const { deviceId, gatewayId, roomId, customName } = req.body;

    if (!deviceId || !gatewayId) {
      return res.status(400).json({
        status: 'error',
        message: 'deviceId and gatewayId are required',
      });
    }

    const { device, isNew } = await deviceService.registerDevice({ deviceId, gatewayId, roomId, customName });

    res.status(isNew ? 201 : 200).json({
      status: 'success',
      data: device,
    });
  } catch (error) {
    console.error('[DeviceController] Registration error:', error.message);
    
    let statusCode = 500;
    if (error.message === 'HOME_HUB_NOT_FOUND') statusCode = 404;
    if (error.message === 'GATEWAY_LINK_FAILED') statusCode = 502;

    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to register device',
    });
  }
};

/**
 * @desc    Rename a device (update customName)
 * @route   PATCH /api/devices/:deviceId
 */
const renameDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { customName } = req.body;

    if (customName === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'customName is required',
      });
    }

    const device = await deviceService.renameDevice(deviceId, customName);

    res.status(200).json({
      status: 'success',
      data: device,
    });
  } catch (error) {
    const statusCode = error.message === 'Device not found' ? 404 : 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to rename device',
    });
  }
};

/**
 * @desc    Remove a device from the system
 * @route   DELETE /api/devices/:deviceId
 */
const deleteDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;

    await deviceService.deleteDevice(deviceId);

    res.status(200).json({
      status: 'success',
      message: 'Device removed successfully',
    });
  } catch (error) {
    const statusCode = error.message === 'Device not found' ? 404 : 500;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to remove device',
    });
  }
};

module.exports = {
  handleIncomingTelemetry,
  getDevices,
  registerDevice,
  renameDevice,
  deleteDevice,
};
