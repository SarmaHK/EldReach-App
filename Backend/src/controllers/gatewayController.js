const Gateway = require('../models/Gateway');
const gatewayManager = require('../services/gatewayManager');

/**
 * @desc    Get WebSocket connection info for gateway
 * @route   POST /api/gateways/connect
 */
const connectGateway = async (req, res) => {
  try {
    const wsPort = process.env.GATEWAY_WS_PORT || 5001;

    res.status(200).json({
      status: 'success',
      message: 'Gateway WebSocket server is available.',
      wsUrl: `ws://${req.hostname}:${wsPort}`,
      instructions: {
        step1: 'Connect to the WebSocket URL with ?token=<auth_token>',
        step2: 'Send REGISTER_GATEWAY message with gatewayId and systemId',
        step3: 'Send periodic HEARTBEAT messages every 30 seconds',
      },
    });
  } catch (error) {
    console.error('[GatewayController] Connect info failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get connection info.',
    });
  }
};

/**
 * @desc    Get the status of a specific or most recent gateway
 * @route   GET /api/gateways/status
 * @query   ?gatewayId=GW001  (optional)
 */
const getGatewayStatus = async (req, res) => {
  try {
    const { gatewayId } = req.query;

    // If specific gateway requested
    if (gatewayId) {
      const gateway = await Gateway.findOne({ gatewayId });
      if (!gateway) {
        return res.status(404).json({
          status: 'error',
          message: `Gateway ${gatewayId} not found.`,
        });
      }

      const connected = gatewayManager.isGatewayConnected(gatewayId);

      return res.status(200).json({
        status: 'success',
        gateway: {
          gatewayId: gateway.gatewayId,
          systemId: gateway.systemId,
          status: connected ? 'ONLINE' : gateway.status,
          lastSeen: gateway.lastSeen,
          connectedAt: gateway.connectedAt,
          wsConnected: connected,
        },
      });
    }

    // Return most recent gateway
    const gateway = await Gateway.findOne().sort({ lastSeen: -1 });

    if (!gateway) {
      return res.status(200).json({
        status: 'success',
        gateway: null,
      });
    }

    const connected = gatewayManager.isGatewayConnected(gateway.gatewayId);

    res.status(200).json({
      status: 'success',
      gateway: {
        gatewayId: gateway.gatewayId,
        systemId: gateway.systemId,
        status: connected ? 'ONLINE' : gateway.status,
        lastSeen: gateway.lastSeen,
        connectedAt: gateway.connectedAt,
        wsConnected: connected,
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

/**
 * @desc    Get all registered gateways with their status
 * @route   GET /api/gateways
 */
const getAllGateways = async (req, res) => {
  try {
    const gateways = await Gateway.find().sort({ lastSeen: -1 });

    const enriched = gateways.map((gw) => ({
      gatewayId: gw.gatewayId,
      systemId: gw.systemId,
      status: gatewayManager.isGatewayConnected(gw.gatewayId) ? 'ONLINE' : gw.status,
      lastSeen: gw.lastSeen,
      connectedAt: gw.connectedAt,
      wsConnected: gatewayManager.isGatewayConnected(gw.gatewayId),
    }));

    res.status(200).json({
      status: 'success',
      count: enriched.length,
      connectedCount: enriched.filter((gw) => gw.wsConnected).length,
      data: enriched,
    });
  } catch (error) {
    console.error('[GatewayController] List failed:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to list gateways.',
    });
  }
};

module.exports = {
  connectGateway,
  getGatewayStatus,
  getAllGateways,
};
