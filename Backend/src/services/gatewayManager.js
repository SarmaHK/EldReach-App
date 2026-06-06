const { v4: uuidv4 } = require('uuid');
const Gateway = require('../models/Gateway');
const socketService = require('./socketService');

/**
 * GatewayManager — Single source of truth for gateway connection state.
 *
 * Maintains an in-memory registry of active WebSocket connections
 * backed by MongoDB persistence. Provides command/response dispatching
 * with requestId-based Promise resolution.
 */

// ── In-Memory State ────────────────────────────────────────────────────────────

/**
 * Active gateway connections.
 * Map<gatewayId, { ws, systemId, connectedAt, lastSeen }>
 */
const activeGateways = new Map();

/**
 * Pending command responses.
 * Map<requestId, { resolve, reject, timer, gatewayId }>
 */
const pendingCommands = new Map();

/** Interval handle for the heartbeat timeout checker */
let timeoutCheckerInterval = null;

// ── Configuration ──────────────────────────────────────────────────────────────

const HEARTBEAT_TIMEOUT = parseInt(process.env.GATEWAY_HEARTBEAT_TIMEOUT, 10) || 60000;
const COMMAND_TIMEOUT = parseInt(process.env.GATEWAY_COMMAND_TIMEOUT, 10) || 10000;
const TIMEOUT_CHECK_INTERVAL = 15000; // How often to scan for stale gateways

// ── Gateway Lifecycle ──────────────────────────────────────────────────────────

/**
 * Register a gateway connection.
 * Called when a gateway sends REGISTER_GATEWAY over WebSocket.
 *
 * @param {string} gatewayId
 * @param {string|null} systemId
 * @param {WebSocket} ws
 * @returns {Promise<object>} The upserted Gateway document
 */
const registerGateway = async (gatewayId, systemId, ws) => {
  const now = new Date();

  // Prevent duplicate active sessions (Connection Hijacking)
  if (activeGateways.has(gatewayId)) {
    console.warn(`[GatewayManager] Duplicate session detected for ${gatewayId}. Disconnecting old session.`);
    const oldEntry = activeGateways.get(gatewayId);
    try {
      oldEntry.ws.close(1008, 'Duplicate session detected. Replaced by new connection.');
    } catch (e) {}
    activeGateways.delete(gatewayId);
  }

  // Store in-memory
  activeGateways.set(gatewayId, {
    ws,
    systemId,
    connectedAt: now,
    lastSeen: now,
  });

  // Persist to MongoDB
  const gateway = await Gateway.findOneAndUpdate(
    { gatewayId },
    {
      $set: {
        systemId: systemId || undefined,
        status: 'ONLINE',
        lastSeen: now,
        connectedAt: now,
      },
      $setOnInsert: {
        gatewayId,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  console.log(`[GatewayManager] Registered gateway: ${gatewayId} (system: ${systemId || 'N/A'})`);

  // Notify frontend clients
  emitGatewayStatus(gateway);

  return gateway;
};

/**
 * Remove a gateway connection (on disconnect).
 *
 * @param {string} gatewayId
 * @returns {Promise<void>}
 */
const removeGateway = async (gatewayId) => {
  // Clean up in-memory
  activeGateways.delete(gatewayId);

  // Clean up any pending commands for this gateway
  for (const [requestId, pending] of pendingCommands.entries()) {
    if (pending.gatewayId === gatewayId) {
      clearTimeout(pending.timer);
      pending.reject(new Error('GATEWAY_DISCONNECTED'));
      pendingCommands.delete(requestId);
    }
  }

  // Update MongoDB
  const gateway = await Gateway.findOneAndUpdate(
    { gatewayId },
    { $set: { status: 'OFFLINE' } },
    { new: true }
  );

  console.log(`[GatewayManager] Removed gateway: ${gatewayId}`);

  if (gateway) {
    emitGatewayStatus(gateway);
  }
};

/**
 * Handle a heartbeat from a gateway.
 *
 * @param {string} gatewayId
 * @returns {Promise<void>}
 */
const handleHeartbeat = async (gatewayId) => {
  const entry = activeGateways.get(gatewayId);
  if (entry) {
    entry.lastSeen = new Date();
  }

  // Periodic DB update (not every heartbeat to reduce writes)
  await Gateway.updateOne(
    { gatewayId },
    { $set: { lastSeen: new Date(), status: 'ONLINE' } }
  );
};

// ── Command Dispatching ────────────────────────────────────────────────────────

/**
 * Send a command to a specific gateway and wait for the response.
 * Uses requestId-based Promise resolution with timeout.
 *
 * @param {string} gatewayId
 * @param {object} command - Command payload (must include `type`)
 * @returns {Promise<object>} The gateway's response
 * @throws {Error} GATEWAY_NOT_CONNECTED, GATEWAY_TIMEOUT, GATEWAY_DISCONNECTED
 */
const sendCommand = (gatewayId, command) => {
  return new Promise((resolve, reject) => {
    const entry = activeGateways.get(gatewayId);
    if (!entry || !entry.ws || entry.ws.readyState !== 1) {
      return reject(new Error('GATEWAY_NOT_CONNECTED'));
    }

    const requestId = uuidv4();
    const payload = {
      ...command,
      requestId,
    };

    // Set up timeout
    const timer = setTimeout(() => {
      pendingCommands.delete(requestId);
      reject(new Error('GATEWAY_TIMEOUT'));
    }, COMMAND_TIMEOUT);

    // Store pending command
    pendingCommands.set(requestId, {
      resolve,
      reject,
      timer,
      gatewayId,
    });

    // Send to gateway
    try {
      entry.ws.send(JSON.stringify(payload));
      console.log(`[GatewayManager] Sent command to ${gatewayId}: ${command.type} (requestId: ${requestId})`);
    } catch (err) {
      clearTimeout(timer);
      pendingCommands.delete(requestId);
      reject(new Error('GATEWAY_SEND_FAILED'));
    }
  });
};

/**
 * Resolve a pending command with the gateway's response.
 * Called when the WebSocket handler receives a response with a requestId.
 *
 * @param {string} requestId
 * @param {object} response
 * @returns {boolean} Whether a pending command was found and resolved
 */
const resolveCommand = (requestId, response) => {
  const pending = pendingCommands.get(requestId);
  if (!pending) {
    console.warn(`[GatewayManager] No pending command for requestId: ${requestId}`);
    return false;
  }

  clearTimeout(pending.timer);
  pendingCommands.delete(requestId);
  pending.resolve(response);
  return true;
};

// ── Query Methods ──────────────────────────────────────────────────────────────

/**
 * Check if a gateway is currently connected via WebSocket.
 *
 * @param {string} gatewayId
 * @returns {boolean}
 */
const isGatewayConnected = (gatewayId) => {
  const entry = activeGateways.get(gatewayId);
  return !!(entry && entry.ws && entry.ws.readyState === 1);
};

/**
 * Get the real-time status of a specific gateway.
 *
 * @param {string} gatewayId
 * @returns {object|null}
 */
const getGatewayStatus = (gatewayId) => {
  const entry = activeGateways.get(gatewayId);
  if (!entry) return null;

  return {
    gatewayId,
    systemId: entry.systemId,
    connected: true,
    connectedAt: entry.connectedAt,
    lastSeen: entry.lastSeen,
  };
};

/**
 * Get all connected gateway IDs.
 *
 * @returns {string[]}
 */
const getConnectedGatewayIds = () => {
  return Array.from(activeGateways.keys());
};

// ── Heartbeat Timeout Checker ──────────────────────────────────────────────────

/**
 * Start the periodic timeout checker.
 * Marks gateways as OFFLINE if no heartbeat received within HEARTBEAT_TIMEOUT.
 */
const startTimeoutChecker = () => {
  if (timeoutCheckerInterval) {
    clearInterval(timeoutCheckerInterval);
  }

  console.log(`[GatewayManager] Timeout checker started (interval: ${TIMEOUT_CHECK_INTERVAL / 1000}s, timeout: ${HEARTBEAT_TIMEOUT / 1000}s)`);

  timeoutCheckerInterval = setInterval(async () => {
    const now = Date.now();

    for (const [gatewayId, entry] of activeGateways.entries()) {
      const timeSinceLastSeen = now - entry.lastSeen.getTime();

      if (timeSinceLastSeen > HEARTBEAT_TIMEOUT) {
        console.warn(`[GatewayManager] Gateway ${gatewayId} heartbeat timeout (${Math.round(timeSinceLastSeen / 1000)}s). Disconnecting.`);

        // Close the WebSocket connection
        try {
          entry.ws.close(1000, 'Heartbeat timeout');
        } catch (e) {
          // ws may already be closed
        }

        // removeGateway will handle cleanup
        await removeGateway(gatewayId);
      }
    }
  }, TIMEOUT_CHECK_INTERVAL);
};

/**
 * Stop the timeout checker.
 */
const stopTimeoutChecker = () => {
  if (timeoutCheckerInterval) {
    clearInterval(timeoutCheckerInterval);
    timeoutCheckerInterval = null;
    console.log('[GatewayManager] Timeout checker stopped.');
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Emit gateway status to all connected frontend clients via Socket.IO.
 */
const emitGatewayStatus = (gateway) => {
  const io = socketService.getIO();
  if (io) {
    io.emit('gateway:status', {
      gatewayId: gateway.gatewayId,
      systemId: gateway.systemId,
      status: gateway.status,
      lastSeen: gateway.lastSeen,
      connectedAt: gateway.connectedAt,
    });
  }
};

module.exports = {
  registerGateway,
  removeGateway,
  handleHeartbeat,
  sendCommand,
  resolveCommand,
  isGatewayConnected,
  getGatewayStatus,
  getConnectedGatewayIds,
  startTimeoutChecker,
  stopTimeoutChecker,
};
