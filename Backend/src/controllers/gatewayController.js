const { scanForGateway } = require('../services/gatewayService');

/**
 * @desc    Scan network for EldReach gateway via mDNS
 * @route   POST /api/gateway/scan
 */
const scanGateway = async (req, res) => {
  try {
    const result = await scanForGateway();

    if (!result.success) {
      // Return appropriate HTTP status based on error type
      const statusCode = result.error === 'GATEWAY_NOT_FOUND' ? 503 : 502;
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

module.exports = {
  scanGateway,
};
