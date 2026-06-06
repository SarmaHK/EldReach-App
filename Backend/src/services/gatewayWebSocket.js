const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const url = require('url');
const gatewayManager = require('./gatewayManager');
const securityLogger = require('./logger');

/**
 * Gateway WebSocket Server
 *
 * Dedicated WebSocket server for gateway (Central Hub) connections.
 * Runs on a separate port from the Express/Socket.IO server.
 *
 * Connection flow:
 *   1. Gateway connects: ws://backend:5001?token=<auth_token>
 *   2. Server validates token
 *   3. Gateway sends REGISTER_GATEWAY message
 *   4. Server registers gateway, sends REGISTRATION_ACK
 *   5. Gateway sends periodic HEARTBEAT messages
 *   6. Server can send commands (VERIFY_SENSOR, etc.)
 *   7. Gateway sends responses (SENSOR_VERIFIED, etc.)
 */

let wss = null;

// ── Configuration ──────────────────────────────────────────────────────────────

const WS_PORT = parseInt(process.env.GATEWAY_WS_PORT, 10) || 5001;
const AUTH_TOKEN = process.env.GATEWAY_AUTH_TOKEN || 'eldreach-gw-secret-2026';

// ── Message Types ──────────────────────────────────────────────────────────────

const MSG_TYPES = {
  // Gateway → Backend
  REGISTER_GATEWAY: 'REGISTER_GATEWAY',
  HEARTBEAT: 'HEARTBEAT',
  SENSOR_VERIFIED: 'SENSOR_VERIFIED',

  // Backend → Gateway
  REGISTRATION_ACK: 'REGISTRATION_ACK',
  REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
  VERIFY_SENSOR: 'VERIFY_SENSOR',
  ERROR: 'ERROR',
};

// ── Server Initialization ──────────────────────────────────────────────────────

/**
 * Initialize the Gateway WebSocket server.
 */
const initGatewayWebSocket = () => {
  wss = new WebSocketServer({
    port: WS_PORT,
    verifyClient: (info, callback) => {
      // ── Authentication ──
      try {
        const params = new URL(info.req.url, `http://${info.req.headers.host}`).searchParams;
        const token = params.get('token');

        if (!token || token !== AUTH_TOKEN) {
          securityLogger.warn('WebSocket connection rejected', {
            ip: info.req.socket.remoteAddress,
            reason: 'Invalid or missing token',
          });
          callback(false, 401, 'Unauthorized');
          return;
        }

        callback(true);
      } catch (err) {
        securityLogger.error('WebSocket auth error', { error: err.message });
        callback(false, 500, 'Internal Server Error');
      }
    },
  });

  wss.on('listening', () => {
    console.log(`[GatewayWS] WebSocket server listening on port ${WS_PORT}`);
  });

  wss.on('connection', (ws, req) => {
    console.log(`[GatewayWS] New gateway connection from ${req.socket.remoteAddress}`);

    // Track which gateway this connection belongs to
    let registeredGatewayId = null;

    // ── Registration Timeout ──
    // Gateway must send REGISTER_GATEWAY within 10 seconds
    const registrationTimeout = setTimeout(() => {
      if (!registeredGatewayId) {
        console.warn('[GatewayWS] Gateway did not register within timeout. Closing.');
        sendMessage(ws, {
          type: MSG_TYPES.REGISTRATION_REJECTED,
          reason: 'Registration timeout',
        });
        ws.close(1008, 'Registration timeout');
      }
    }, 10000);

    // ── Message Handler ──
    ws.on('message', async (rawData) => {
      let message;

      try {
        message = JSON.parse(rawData.toString());
      } catch (err) {
        console.error('[GatewayWS] Invalid JSON received:', rawData.toString().substring(0, 100));
        sendMessage(ws, {
          type: MSG_TYPES.ERROR,
          error: 'INVALID_JSON',
          message: 'Message must be valid JSON',
        });
        return;
      }

      // Ignore messages without a type
      if (!message.type) {
        sendMessage(ws, {
          type: MSG_TYPES.ERROR,
          error: 'MISSING_TYPE',
          message: 'Message must include a "type" field',
        });
        return;
      }

      // ── HMAC Signature Validation ──
      const { signature, timestamp } = message;
      if (!signature || !timestamp) {
        securityLogger.warn('WebSocket message rejected: Missing signature or timestamp', { gatewayId: registeredGatewayId });
        sendMessage(ws, { type: MSG_TYPES.ERROR, error: 'MISSING_SECURITY_HEADERS', message: 'Signature and timestamp required' });
        return;
      }

      // Replay Attack Prevention (5 minute window)
      const timeDiff = Math.abs(Date.now() - new Date(timestamp).getTime());
      if (timeDiff > 5 * 60 * 1000) {
        securityLogger.warn('WebSocket message rejected: Timestamp expired (Replay Attack)', { gatewayId: registeredGatewayId });
        sendMessage(ws, { type: MSG_TYPES.ERROR, error: 'EXPIRED_TIMESTAMP', message: 'Message timestamp is too old' });
        return;
      }

      // Verify HMAC
      const hmacSecret = process.env.HMAC_SECRET || 'eldreach_hmac_secret_key_98765';
      const payloadToSign = { ...message };
      delete payloadToSign.signature; // Remove signature before hashing

      // Sort keys for deterministic JSON representation
      const sortedPayload = Object.keys(payloadToSign).sort().reduce((obj, key) => {
        obj[key] = payloadToSign[key];
        return obj;
      }, {});

      const computedSignature = crypto
        .createHmac('sha256', hmacSecret)
        .update(JSON.stringify(sortedPayload))
        .digest('hex');

      if (computedSignature !== signature) {
        securityLogger.warn('WebSocket message rejected: Invalid HMAC Signature', { gatewayId: registeredGatewayId });
        sendMessage(ws, { type: MSG_TYPES.ERROR, error: 'INVALID_SIGNATURE', message: 'Message signature validation failed' });
        return;
      }

      try {
        switch (message.type) {
          // ── REGISTER_GATEWAY ──
          case MSG_TYPES.REGISTER_GATEWAY:
            await handleRegisterGateway(ws, message, registrationTimeout, (gwId) => {
              registeredGatewayId = gwId;
            });
            break;

          // ── HEARTBEAT ──
          case MSG_TYPES.HEARTBEAT:
            await handleHeartbeat(message, registeredGatewayId);
            break;

          // ── SENSOR_VERIFIED (response to VERIFY_SENSOR command) ──
          case MSG_TYPES.SENSOR_VERIFIED:
            handleSensorVerified(message);
            break;

          default:
            console.warn(`[GatewayWS] Unknown message type: ${message.type}`);
            sendMessage(ws, {
              type: MSG_TYPES.ERROR,
              error: 'UNKNOWN_TYPE',
              message: `Unknown message type: ${message.type}`,
            });
        }
      } catch (err) {
        console.error(`[GatewayWS] Error handling ${message.type}:`, err.message);
        sendMessage(ws, {
          type: MSG_TYPES.ERROR,
          error: 'HANDLER_ERROR',
          message: err.message,
        });
      }
    });

    // ── Disconnect Handler ──
    ws.on('close', async (code, reason) => {
      clearTimeout(registrationTimeout);
      const reasonStr = reason ? reason.toString() : 'unknown';
      console.log(`[GatewayWS] Gateway disconnected: ${registeredGatewayId || 'unregistered'} (code: ${code}, reason: ${reasonStr})`);

      if (registeredGatewayId) {
        await gatewayManager.removeGateway(registeredGatewayId);
        registeredGatewayId = null;
      }
    });

    // ── Error Handler ──
    ws.on('error', (err) => {
      console.error(`[GatewayWS] WebSocket error for ${registeredGatewayId || 'unregistered'}:`, err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('[GatewayWS] Server error:', err.message);
  });

  return wss;
};

// ── Message Handlers ───────────────────────────────────────────────────────────

/**
 * Handle REGISTER_GATEWAY message.
 */
const handleRegisterGateway = async (ws, message, registrationTimeout, setGatewayId) => {
  const { gatewayId, systemId } = message;

  if (!gatewayId) {
    sendMessage(ws, {
      type: MSG_TYPES.REGISTRATION_REJECTED,
      reason: 'gatewayId is required',
    });
    return;
  }

  // Clear registration timeout
  clearTimeout(registrationTimeout);

  // Register via GatewayManager
  const gateway = await gatewayManager.registerGateway(gatewayId, systemId || null, ws);
  setGatewayId(gatewayId);

  // Send acknowledgment
  sendMessage(ws, {
    type: MSG_TYPES.REGISTRATION_ACK,
    gatewayId: gateway.gatewayId,
    systemId: gateway.systemId,
    status: gateway.status,
    serverTime: new Date().toISOString(),
  });

  console.log(`[GatewayWS] Gateway registered: ${gatewayId}`);
};

/**
 * Handle HEARTBEAT message.
 */
const handleHeartbeat = async (message, registeredGatewayId) => {
  const gatewayId = message.gatewayId || registeredGatewayId;

  if (!gatewayId) {
    console.warn('[GatewayWS] Heartbeat from unregistered gateway');
    return;
  }

  await gatewayManager.handleHeartbeat(gatewayId);
};

/**
 * Handle SENSOR_VERIFIED response from gateway.
 */
const handleSensorVerified = (message) => {
  const { requestId } = message;

  if (!requestId) {
    console.warn('[GatewayWS] SENSOR_VERIFIED without requestId');
    return;
  }

  const resolved = gatewayManager.resolveCommand(requestId, message);
  if (resolved) {
    console.log(`[GatewayWS] Sensor verification response matched for requestId: ${requestId}`);
  }
};

// ── Utilities ──────────────────────────────────────────────────────────────────

/**
 * Send a JSON message to a WebSocket client.
 */
const sendMessage = (ws, data) => {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
};

/**
 * Get the WebSocket server instance.
 */
const getWSS = () => wss;

module.exports = {
  initGatewayWebSocket,
  getWSS,
  MSG_TYPES,
};
