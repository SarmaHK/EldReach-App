const Gateway = require('../models/Gateway');
const socketService = require('./socketService');
const axios = require('axios');

// How often to check gateway health (ms)
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
// How long before we consider a gateway offline (ms)
const OFFLINE_THRESHOLD = 30000;  // 30 seconds

let heartbeatTimer = null;

/**
 * startGatewayHeartbeat — Periodically checks if the known gateway is still reachable.
 *
 * Logic:
 *   1. Find the most recent gateway record in DB.
 *   2. If lastSeen > OFFLINE_THRESHOLD, try to ping its IP.
 *   3. If ping succeeds, update lastSeen + emit connected.
 *   4. If ping fails, mark offline + emit disconnected.
 *
 * This does NOT use mDNS (which is slow and resource-heavy).
 * Instead, it pings the known gateway IP via HTTP.
 */
const startGatewayHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }

  console.log(`[GatewayHeartbeat] Starting heartbeat check every ${HEARTBEAT_INTERVAL / 1000}s`);

  heartbeatTimer = setInterval(async () => {
    try {
      const gateway = await Gateway.findOne().sort({ lastSeen: -1 });
      if (!gateway) return; // No gateway registered yet

      const now = new Date();
      const timeSinceLastSeen = now.getTime() - new Date(gateway.lastSeen).getTime();

      // If we recently heard from the gateway (via telemetry), skip the ping
      if (timeSinceLastSeen <= OFFLINE_THRESHOLD) {
        // Gateway is still fresh — ensure status is online
        if (gateway.status !== 'online') {
          gateway.status = 'online';
          await gateway.save();
          emitGatewayStatus(gateway);
        }
        return;
      }

      // Gateway hasn't been heard from — try to ping it
      console.log(`[GatewayHeartbeat] Gateway ${gateway.gatewayId} stale (${Math.round(timeSinceLastSeen / 1000)}s). Pinging ${gateway.ip}...`);

      try {
        const response = await axios.get(
          `http://${gateway.ip}/get-system-id`,
          { timeout: 3000 }
        );

        // Ping succeeded — gateway is still alive
        const mac = response.data?.mac || response.data?.systemId || null;

        if (mac) {
          gateway.lastSeen = now;
          gateway.status = 'online';
          await gateway.save();
          console.log(`[GatewayHeartbeat] Gateway ${gateway.gatewayId} responded. Marked online.`);
          emitGatewayStatus(gateway);
        }
      } catch (pingErr) {
        // Ping failed — mark offline
        if (gateway.status !== 'offline') {
          gateway.status = 'offline';
          await gateway.save();
          console.log(`[GatewayHeartbeat] Gateway ${gateway.gatewayId} unreachable. Marked offline.`);
          emitGatewayStatus(gateway);
        }
      }
    } catch (err) {
      console.error('[GatewayHeartbeat] Error during heartbeat:', err.message);
    }
  }, HEARTBEAT_INTERVAL);
};

/**
 * Emit gateway status update to all connected frontend clients.
 */
const emitGatewayStatus = (gateway) => {
  const io = socketService.getIO();
  if (io) {
    io.emit('gateway:status', {
      gatewayId: gateway.gatewayId,
      ip: gateway.ip,
      status: gateway.status,
      lastSeen: gateway.lastSeen,
    });
  }
};

const stopGatewayHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('[GatewayHeartbeat] Stopped.');
  }
};

module.exports = {
  startGatewayHeartbeat,
  stopGatewayHeartbeat,
};
