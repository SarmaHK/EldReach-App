const { scanForGateway } = require('../services/gatewayService');
const Gateway = require('../models/Gateway');

/**
 * @desc    Scan network for EldReach gateway via mDNS
 * @route   POST /api/gateway/scan
 */
const scanGateway = async (req, res) => {
  try {
    const result = await scanForGateway();

    if (!result.success) {
      // Return appropriate HTTP status based on error type
      const statusCode = (result.error === 'GATEWAY_NOT_FOUND' || result.error === 'GATEWAY_SCAN_FAILED') ? 503 : 502;
      return res.status(statusCode).json({
        status: 'error',
        error: result.error,
        message: result.message,
      });
    }

    res.status(200).json({
      status: 'success',
      success: true,
      gateway: result.gateway,
    });
  } catch (error) {
    console.error('[GatewayController] Scan failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'SCAN_FAILED',
      message: error.message || 'An unexpected error occurred during gateway scan.',
    });
  }
};

/**
 * @desc    Get the most recently seen gateway status
 * @route   GET /api/gateway/status
 */
const getGatewayStatus = async (req, res) => {
  try {
    const gateway = await Gateway.findOne().sort({ lastSeen: -1 });

    if (!gateway) {
      return res.status(200).json({
        status: 'success',
        gateway: null,
      });
    }

    res.status(200).json({
      status: 'success',
      gateway: {
        gatewayId: gateway.gatewayId,
        ip: gateway.ip,
        status: gateway.status,
        lastSeen: gateway.lastSeen,
      },
    });
  } catch (error) {
    console.error('[GatewayController] Status check failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to check gateway status.',
    });
  }
};

module.exports = {
  scanGateway,
  getGatewayStatus,
};
