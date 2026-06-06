import axios from 'axios';
import socket from './socket';

const API_BASE = 'http://localhost:5000/api';

/**
 * Returns initial device pool.
 * Fetch real devices from backend.
 *
 * @returns {Promise<Device[]>}
 */
export async function getDevices() {
  try {
    const res = await axios.get(`${API_BASE}/devices`);
    // Ensure the returned objects have the required frontend fields (like connectionStatus)
    return res.data.data.map(d => {
      let connectionStatus = 'CONNECTING';
      if (d.lastSeen) {
        const timeSince = Date.now() - new Date(d.lastSeen).getTime();
        connectionStatus = timeSince <= 30000 ? 'CONNECTED' : 'DISCONNECTED';
      }
      return {
        ...d,
        id: d._id || `disc-${Date.now()}-${Math.random()}`,
        connectionStatus,
        assignedRoomId: null,
        assignedNodeId: null,
        scannedAt: Date.now(),
      };
    });
  } catch (error) {
    console.error('[DeviceService] Failed to fetch devices:', error);
    return [];
  }
}

/**
 * Fetch initial alerts from backend.
 */
export async function getAlerts() {
  try {
    const res = await axios.get(`${API_BASE}/alerts`);
    return res.data.data;
  } catch (error) {
    console.error('[DeviceService] Failed to fetch alerts:', error);
    return [];
  }
}

/**
 * Fetch initial rooms from backend.
 */
export async function getRooms() {
  try {
    const res = await axios.get(`${API_BASE}/rooms`);
    return res.data.data;
  } catch (error) {
    console.error('[DeviceService] Failed to fetch rooms:', error);
    return [];
  }
}

/**
 * Subscribe to live device updates via Socket.IO.
 * @param {(device: any) => void} callback
 * @returns {() => void}  Unsubscribe function
 */
export function subscribeToDeviceUpdates(callback) {
  socket.on('device:update', (device) => {
    callback(device);
  });
  return () => {
    socket.off('device:update');
  };
}

/**
 * Subscribe to live alerts via Socket.IO.
 * @param {(alert: any) => void} callback
 * @returns {() => void}  Unsubscribe function
 */
export function subscribeToAlerts(callback) {
  socket.on('alert:new', (alert) => {
    callback(alert);
  });
  return () => {
    socket.off('alert:new');
  };
}

export async function mapDeviceToRoom(deviceId, roomId) {
  return Promise.resolve();
}

export async function connectToGateway(gatewayId) {
  console.info(`[DeviceService] connectToGateway("${gatewayId}")`);
  return Promise.resolve({ connected: true });
}

/**
 * Get gateway WebSocket connection info from the backend.
 * @returns {Promise<{ status: string, wsUrl?: string, message?: string }>}
 */
export async function connectGateway() {
  try {
    const res = await axios.post(`${API_BASE}/gateways/connect`);
    return res.data;
  } catch (error) {
    if (error.response?.data) {
      return {
        status: 'error',
        error: error.response.data.error || 'CONNECT_FAILED',
        message: error.response.data.message || 'Gateway connection failed.',
      };
    }
    return {
      status: 'error',
      error: 'NETWORK_ERROR',
      message: 'Unable to reach backend. Is the server running?',
    };
  }
}

/**
 * Trigger a gateway scan via mDNS on the backend.
 * @deprecated Use connectGateway() instead. Gateway now connects via WebSocket.
 * @returns {Promise<{ success: boolean, gateway?: object, error?: string, message?: string }>}
 */
export async function scanForGateway() {
  // Redirect to the new connect endpoint for backwards compatibility
  const result = await connectGateway();
  return {
    success: result.status === 'success',
    ...result,
  };
}

/**
 * Subscribe to gateway status updates via Socket.IO.
 * @param {(data: any) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToGatewayUpdates(callback) {
  socket.on('gateway:status', (data) => {
    callback(data);
  });
  return () => {
    socket.off('gateway:status');
  };
}

/**
 * Fetch current gateway status from backend.
 * @param {string} [gatewayId] - Optional specific gateway ID
 * @returns {Promise<{ gateway: object | null }>}
 */
export async function getGatewayStatus(gatewayId) {
  try {
    const params = gatewayId ? `?gatewayId=${encodeURIComponent(gatewayId)}` : '';
    const res = await axios.get(`${API_BASE}/gateways/status${params}`);
    return res.data.gateway || null;
  } catch (error) {
    console.error('[DeviceService] Failed to fetch gateway status:', error);
    return null;
  }
}

/**
 * Get all registered gateways.
 * @returns {Promise<{ data: object[], count: number, connectedCount: number } | null>}
 */
export async function getAllGateways() {
  try {
    const res = await axios.get(`${API_BASE}/gateways`);
    return res.data;
  } catch (error) {
    console.error('[DeviceService] Failed to fetch gateways:', error);
    return null;
  }
}

/**
 * Verify a sensor MAC address via the gateway WebSocket.
 * The backend sends a VERIFY_SENSOR command to the gateway
 * and returns the result.
 *
 * @param {string} macAddress - Sensor MAC address (e.g., "AA:BB:CC:DD:EE:FF")
 * @param {string} gatewayId - ID of the gateway to verify against
 * @returns {Promise<{ status: string, verified?: boolean, device?: object, error?: string, message?: string }>}
 */
export async function verifySensor(macAddress, gatewayId) {
  try {
    const res = await axios.post(`${API_BASE}/devices/verify`, {
      macAddress,
      gatewayId,
    });
    return res.data;
  } catch (error) {
    if (error.response?.data) {
      return {
        status: 'error',
        verified: false,
        error: error.response.data.error || 'VERIFICATION_FAILED',
        message: error.response.data.message || 'Sensor verification failed.',
      };
    }
    return {
      status: 'error',
      verified: false,
      error: 'NETWORK_ERROR',
      message: 'Unable to reach backend. Is the server running?',
    };
  }
}

/**
 * Rename a device (update its customName).
 * @param {string} deviceId - The device's MAC-based ID
 * @param {string} customName - New friendly name
 * @returns {Promise<{ success: boolean, device?: object, error?: string }>}
 */
export async function renameDevice(deviceId, customName) {
  try {
    const res = await axios.patch(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`, { customName });
    return { success: true, device: res.data.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to rename device',
    };
  }
}

/**
 * Remove a device from the system.
 * @param {string} deviceId - The device's MAC-based ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteDevice(deviceId) {
  try {
    await axios.delete(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to remove device',
    };
  }
}
