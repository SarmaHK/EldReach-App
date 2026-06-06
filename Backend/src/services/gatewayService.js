const Gateway = require('../models/Gateway');
const gatewayManager = require('./gatewayManager');

/**
 * Gateway Service — Utility functions for gateway operations.
 *
 * This module provides high-level gateway operations that work
 * through the GatewayManager (WebSocket-based). The old mDNS
 * scanning and HTTP handshake approach has been replaced.
 */

/**
 * Get the status of a specific gateway.
 * Combines MongoDB record with real-time WebSocket connection state.
 *
 * @param {string} gatewayId
 * @returns {Promise<object|null>}
 */
const getGatewayInfo = async (gatewayId) => {
  const gateway = await Gateway.findOne({ gatewayId });
  if (!gateway) return null;

  const connected = gatewayManager.isGatewayConnected(gatewayId);

  return {
    gatewayId: gateway.gatewayId,
    systemId: gateway.systemId,
    status: connected ? 'ONLINE' : gateway.status,
    lastSeen: gateway.lastSeen,
    connectedAt: gateway.connectedAt,
    wsConnected: connected,
  };
};

/**
 * Get all gateways with their real-time connection state.
 *
 * @returns {Promise<object[]>}
 */
const getAllGatewayInfo = async () => {
  const gateways = await Gateway.find().sort({ lastSeen: -1 });

  return gateways.map((gw) => ({
    gatewayId: gw.gatewayId,
    systemId: gw.systemId,
    status: gatewayManager.isGatewayConnected(gw.gatewayId) ? 'ONLINE' : gw.status,
    lastSeen: gw.lastSeen,
    connectedAt: gw.connectedAt,
    wsConnected: gatewayManager.isGatewayConnected(gw.gatewayId),
  }));
};

/**
 * Check if a gateway is currently reachable (connected via WebSocket).
 *
 * @param {string} gatewayId
 * @returns {boolean}
 */
const isGatewayReachable = (gatewayId) => {
  return gatewayManager.isGatewayConnected(gatewayId);
};

/**
 * Send a command to a gateway and wait for the response.
 *
 * @param {string} gatewayId
 * @param {object} command
 * @returns {Promise<object>}
 */
const sendGatewayCommand = async (gatewayId, command) => {
  return gatewayManager.sendCommand(gatewayId, command);
};

module.exports = {
  getGatewayInfo,
  getAllGatewayInfo,
  isGatewayReachable,
  sendGatewayCommand,
};
