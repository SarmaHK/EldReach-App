const Bonjour = require('bonjour-service').Bonjour;
const axios = require('axios');
const Gateway = require('../models/Gateway');

// Timeout for mDNS scan (ms)
const SCAN_TIMEOUT = 5000;

// Timeout for HTTP handshake with gateway (ms)
const HANDSHAKE_TIMEOUT = 3000;

/**
 * scanForGateway — Performs mDNS discovery + MAC handshake.
 *
 * Steps:
 *   1. Use bonjour-service to browse for "_eldreach._tcp" services.
 *   2. On first service found, extract IP from mDNS response.
 *   3. Call GET http://<ip>/get-system-id to fetch the gateway's MAC address.
 *   4. Upsert the Gateway document in MongoDB.
 *
 * @returns {{ success: boolean, gateway?: object, error?: string }}
 */
const scanForGateway = async () => {
  console.log('[Gateway Scan] Scanning for gateway...');
  let gatewayIp = null;

  // ── Step 1: mDNS Discovery ──────────────────────────────────────────────
  try {
    gatewayIp = await new Promise((resolve, reject) => {
      const bonjour = new Bonjour();
      let found = false;

      const browser = bonjour.find({ type: 'eldreach' }, (service) => {
        if (found) return;
        found = true;

        // Extract the first IPv4 address
        const ipv4 = service.addresses?.find(
          (addr) => addr && !addr.includes(':')
        );
        const ip = ipv4 || service.referer?.address || null;

        console.log(`[GatewayService] Gateway found at ${ip}`);

        browser.stop();
        bonjour.destroy();
        resolve(ip);
      });

      // Timeout if no service found
      setTimeout(() => {
        if (!found) {
          browser.stop();
          bonjour.destroy();
          reject(new Error('GATEWAY_NOT_FOUND'));
        }
      }, SCAN_TIMEOUT);
    });
  } catch (err) {
    if (err.message === 'GATEWAY_NOT_FOUND') {
      console.log('[GatewayService] Fallback used: 192.168.1.100');
      gatewayIp = '192.168.1.100';
    } else {
      throw err;
    }
  }

  if (!gatewayIp) {
    console.log('[GatewayService] Fallback used: 192.168.1.100');
    gatewayIp = '192.168.1.100';
  }

  // ── Step 2: MAC Address Handshake ───────────────────────────────────────
  let macAddress = null;

  try {
    const response = await axios.get(
      `http://${gatewayIp}/get-system-id`,
      { timeout: HANDSHAKE_TIMEOUT }
    );

    macAddress = response.data?.mac || response.data?.systemId || null;
    console.log(`[GatewayService] Handshake OK — MAC: ${macAddress}`);
  } catch (err) {
    console.error(`[GatewayService] Handshake failed for ${gatewayIp}:`, err.message);
    return {
      success: false,
      error: 'GATEWAY_SCAN_FAILED',
      message: 'Could not connect to Home Hub. Please check the connection.',
    };
  }

  if (!macAddress) {
    return {
      success: false,
      error: 'ID_HANDSHAKE_FAILED',
      message: 'Gateway responded but did not return a valid system ID.',
    };
  }

  // ── Step 3: Upsert Gateway in Database ──────────────────────────────────
  const now = new Date();

  const gateway = await Gateway.findOneAndUpdate(
    { gatewayId: macAddress },
    {
      $set: {
        ip: gatewayIp,
        status: 'online',
        lastSeen: now,
      },
      $setOnInsert: {
        gatewayId: macAddress,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  console.log(`[GatewayService] Gateway upserted: ${gateway.gatewayId} @ ${gateway.ip}`);

  const socketService = require('./socketService');
  const io = socketService.getIO();
  if (io) {
    io.emit('gateway:status', {
      gatewayId: gateway.gatewayId,
      ip: gateway.ip,
      status: gateway.status,
      lastSeen: gateway.lastSeen,
    });
  }

  return {
    success: true,
    gateway: {
      gatewayId: gateway.gatewayId,
      ip: gateway.ip,
      status: gateway.status,
      lastSeen: gateway.lastSeen,
    },
  };
};

module.exports = {
  scanForGateway,
};
