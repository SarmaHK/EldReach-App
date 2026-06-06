const Device = require('../models/Device');
const gatewayManager = require('../services/gatewayManager');

/**
 * @desc    Verify a sensor MAC address via gateway WebSocket
 * @route   POST /api/devices/verify
 * @body    { macAddress: "AA:BB:CC:DD:EE:FF", gatewayId: "GW001" }
 */
const verifySensor = async (req, res) => {
  try {
    const { macAddress, gatewayId } = req.body;

    // ── Validation ──
    if (!macAddress) {
      return res.status(400).json({
        status: 'error',
        error: 'MISSING_MAC_ADDRESS',
        message: 'macAddress is required.',
      });
    }

    if (!gatewayId) {
      return res.status(400).json({
        status: 'error',
        error: 'MISSING_GATEWAY_ID',
        message: 'gatewayId is required.',
      });
    }

    // Normalize MAC address
    const normalizedMac = macAddress.toUpperCase().replace(/[^A-F0-9]/g, '');
    const formattedMac = macAddress.toUpperCase().trim();

    // Validate MAC format (basic check: 12 hex chars)
    if (normalizedMac.length !== 12 || !/^[A-F0-9]+$/.test(normalizedMac)) {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_MAC_ADDRESS',
        message: 'MAC address must be 12 hex characters (e.g., AA:BB:CC:DD:EE:FF).',
      });
    }

    // ── Check Gateway Connection ──
    if (!gatewayManager.isGatewayConnected(gatewayId)) {
      return res.status(503).json({
        status: 'error',
        error: 'GATEWAY_NOT_CONNECTED',
        message: `Gateway ${gatewayId} is not connected. Please ensure the gateway is online.`,
      });
    }

    // ── Update Device Status to VERIFYING ──
    let device = await Device.findOne({ macAddress: formattedMac });

    if (device) {
      device.status = 'VERIFYING';
      await device.save();
    }

    // ── Send VERIFY_SENSOR Command via WebSocket ──
    console.log(`[VerifyController] Sending VERIFY_SENSOR for ${formattedMac} to gateway ${gatewayId}`);

    let response;
    try {
      response = await gatewayManager.sendCommand(gatewayId, {
        type: 'VERIFY_SENSOR',
        macAddress: formattedMac,
      });
    } catch (err) {
      // Handle specific errors
      const errorMap = {
        GATEWAY_NOT_CONNECTED: { status: 503, message: 'Gateway disconnected during verification.' },
        GATEWAY_TIMEOUT: { status: 504, message: 'Gateway did not respond within the timeout period.' },
        GATEWAY_DISCONNECTED: { status: 503, message: 'Gateway disconnected during verification.' },
        GATEWAY_SEND_FAILED: { status: 502, message: 'Failed to send command to gateway.' },
      };

      const errorInfo = errorMap[err.message] || { status: 500, message: err.message };

      // Revert device status if it was set to VERIFYING
      if (device) {
        device.status = 'REGISTERED';
        await device.save();

        const socketService = require('../services/socketService');
        const io = socketService.getIO();
        if (io) {
          io.emit('device:update', {
            deviceId: device.deviceId,
            macAddress: device.macAddress,
            status: device.status,
            gatewayId: device.gatewayId,
          });
        }
      }

      return res.status(errorInfo.status).json({
        status: 'error',
        error: err.message,
        message: errorInfo.message,
      });
    }

    // ── Process Gateway Response ──
    const sensorActive = response.active === true;
    const newStatus = sensorActive ? 'ACTIVE' : 'REGISTERED';

    // Upsert device record
    device = await Device.findOneAndUpdate(
      { macAddress: formattedMac },
      {
        $set: {
          status: newStatus,
          gatewayId,
          macAddress: formattedMac,
          lastSeen: sensorActive ? new Date() : undefined,
        },
        $setOnInsert: {
          deviceId: normalizedMac,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    console.log(`[VerifyController] Sensor ${formattedMac} verified: active=${sensorActive}, status=${newStatus}`);

    // Emit real-time Socket.IO update
    const socketService = require('../services/socketService');
    const io = socketService.getIO();
    if (io) {
      io.emit('device:update', {
        deviceId: device.deviceId,
        macAddress: device.macAddress,
        status: device.status,
        gatewayId: device.gatewayId,
        customName: device.customName,
      });
      console.log(`[Socket] Emitted device:update for verified device ${device.deviceId}`);
    }

    res.status(200).json({
      status: 'success',
      verified: sensorActive,
      device: {
        deviceId: device.deviceId,
        macAddress: device.macAddress,
        status: device.status,
        gatewayId: device.gatewayId,
        customName: device.customName,
      },
    });
  } catch (error) {
    console.error('[VerifyController] Sensor verification error:', error);
    res.status(500).json({
      status: 'error',
      error: 'VERIFICATION_FAILED',
      message: error.message || 'An unexpected error occurred during sensor verification.',
    });
  }
};

module.exports = {
  verifySensor,
};
