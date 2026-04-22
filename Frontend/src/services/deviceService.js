/**
 * deviceService.js  —  EldReach data abstraction layer
 *
 * All device I/O goes through this file. Components and the store never
 * talk to a network directly — they call these functions.
 *
 * ── Integration checklist (switching to real hardware) ──────────────────────
 *  1. Set IS_SIMULATION_MODE = false in simulationService.js
 *  2. Replace getDevices() with a real HTTP / MQTT fetch
 *  3. Implement subscribeToDeviceUpdates() with your WS / MQTT broker
 *  4. Fill connectToGateway() with your gateway handshake
 *  5. onDeviceDataReceived() is called by your WS handler — adapt the
 *     payload shape to match your gateway's JSON schema
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types (JSDoc for IDE autocompletion) ────────────────────────────────────

/**
 * @typedef {Object} Device
 * @property {string}  id                Internal pool key
 * @property {string}  deviceId          Human-readable ID, e.g. 'ELD-01-A3F2'
 * @property {'CONNECTED'|'CONNECTING'|'DISCONNECTED'} connectionStatus
 * @property {string|null} assignedRoomId  Logical room this device is bound to
 * @property {string|null} assignedNodeId  Canvas sensor node this device is bound to
 * @property {number}  scannedAt          Unix timestamp of discovery
 */

/**
 * @typedef {Object} DeviceEvent
 * @property {string}  deviceId
 * @property {'CONNECTED'|'DISCONNECTED'} connectionStatus
 * @property {number}  lastSeen
 * @property {boolean} motionDetected
 */

// ─── Internal helpers ────────────────────────────────────────────────────────

const _hex = (len) =>
  Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');

const _makeDeviceId = () => `ELD-01-${_hex(2)}${_hex(2)}`;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns initial device pool.
 * Simulation: generates mock discovered devices.
 * Production: replace with a real API call or gateway query.
 *
 * @param {number} [count=6]
 * @returns {Device[]}
 */
export function getDevices(count = 6) {
  return Array.from({ length: count }, (_, i) => ({
    id:               `disc-${Date.now()}-${i}`,
    deviceId:         _makeDeviceId(),
    connectionStatus: Math.random() > 0.15 ? 'CONNECTED' : 'CONNECTING',
    assignedRoomId:   null,
    assignedNodeId:   null,      // ← required field for node-binding system
    scannedAt:        Date.now(),
  }));
}

/**
 * Subscribe to live device updates.
 * Simulation: no-op (simulation ticks write to store directly).
 * Production: open a WebSocket / MQTT subscription here.
 *
 * @param {(event: DeviceEvent) => void} callback
 * @returns {() => void}  Unsubscribe / cleanup function
 */
export function subscribeToDeviceUpdates(callback) {
  // TODO (real hardware):
  // const ws = new WebSocket('wss://your-gateway-host/devices');
  // ws.onmessage = (msg) => {
  //   const event = onDeviceDataReceived(JSON.parse(msg.data));
  //   if (event) callback(event);
  // };
  // return () => ws.close();

  return () => {}; // no-op cleanup in simulation mode
}

/**
 * Persist a device → room mapping to the backend.
 * Simulation: state is managed locally, no network call needed.
 * Production: POST to your gateway API.
 *
 * @param {string} deviceId
 * @param {string} roomId
 * @returns {Promise<void>}
 */
export async function mapDeviceToRoom(deviceId, roomId) {
  // TODO (real hardware):
  // await fetch(`/api/devices/${deviceId}/assign`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ roomId }),
  // });
  return Promise.resolve();
}

/**
 * Initiate a connection handshake with the physical gateway.
 * Simulation: resolves immediately.
 * Production: establish MQTT / WebSocket session.
 *
 * @param {string} gatewayId  e.g. 'GW-ELD-01'
 * @returns {Promise<{ connected: boolean }>}
 */
export async function connectToGateway(gatewayId) {
  // TODO (real hardware):
  // const res = await fetch(`/api/gateway/${gatewayId}/connect`, { method: 'POST' });
  // return { connected: (await res.json()).status === 'ok' };

  console.info(`[DeviceService] connectToGateway("${gatewayId}") — stub, no hardware connected.`);
  return Promise.resolve({ connected: true });
}

/**
 * Parse a raw payload from a physical device into a normalized DeviceEvent.
 * Called by your WebSocket / MQTT message handler.
 * This is the single entry point for all inbound device data.
 *
 * @param {unknown} rawPayload  Raw JSON from the gateway
 * @returns {DeviceEvent|null}  Null if payload is invalid or missing device_id
 */
export function onDeviceDataReceived(rawPayload) {
  try {
    const { device_id, status, timestamp, motion } = rawPayload ?? {};
    if (!device_id) return null;
    return {
      deviceId:         String(device_id),
      connectionStatus: status === 'online' ? 'CONNECTED' : 'DISCONNECTED',
      lastSeen:         timestamp ? Number(timestamp) : Date.now(),
      motionDetected:   Boolean(motion),
    };
  } catch {
    return null;
  }
}
