const Device = require('../models/Device');
const Gateway = require('../models/Gateway');
const { createAlert } = require('./alertService');
const socketService = require('./socketService');
const logService = require('./logService');
const { processSensorData } = require('./processingService');

let timeoutIntervalId = null;

/**
 * Starts a periodic checker to monitor sensor heartbeats.
 * If a sensor hasn't been seen within the threshold, marks it OFFLINE.
 */
const startSensorTimeoutChecker = (intervalMs = 15000, timeoutMs = 45000) => {
  if (timeoutIntervalId) {
    clearInterval(timeoutIntervalId);
  }

  timeoutIntervalId = setInterval(async () => {
    try {
      const thresholdDate = new Date(Date.now() - timeoutMs);
      
      // Find devices that are ONLINE/ACTIVE but haven't been seen recently
      const timedOutDevices = await Device.find({
        status: { $in: ['ACTIVE', 'ONLINE'] },
        lastSeen: { $lt: thresholdDate }
      });

      if (timedOutDevices.length > 0) {
        for (const device of timedOutDevices) {
          device.status = 'OFFLINE';
          await device.save();
          
          console.log(`[DeviceService] Sensor ${device.deviceId} timed out. Marked OFFLINE.`);
          
          // Broadcast update
          const io = socketService.getIO();
          if (io) {
            io.emit('device:update', {
              deviceId: device.deviceId,
              macAddress: device.macAddress,
              status: device.status,
              gatewayId: device.gatewayId,
              customName: device.customName,
              lastSeen: device.lastSeen,
            });
          }
        }
      }
    } catch (err) {
      console.error('[DeviceService] Timeout checker error:', err.message);
    }
  }, intervalMs);

  console.log(`[DeviceService] Sensor timeout checker started (interval: ${intervalMs}ms, timeout: ${timeoutMs}ms)`);
};

/**
 * Get all devices, sorted by most recent lastSeen.
 */
const getAllDevices = async () => {
  return Device.find().sort({ lastSeen: -1 });
};

const registerDevice = async ({ deviceId, gatewayId, roomId, customName }) => {
  const now = new Date();
  const normalizedId = deviceId.toUpperCase();
  
  // ── Step 1: Validate Gateway Exists ──
  const gateway = await Gateway.findOne({ gatewayId });
  if (!gateway) {
    throw new Error('HOME_HUB_NOT_FOUND');
  }

  // ── Step 2: Save to Database ──
  // Sensor verification/linking is now handled separately via
  // POST /api/devices/verify (WebSocket-based)
  let device = await Device.findOne({ deviceId: normalizedId });
  let isNew = false;
  
  if (device) {
    device.gatewayId = gatewayId;
    if (roomId) device.roomId = roomId;
    if (customName !== undefined) device.customName = customName;
    device.macAddress = normalizedId;
    device.lastSeen = null;
    await device.save();
  } else {
    isNew = true;
    device = new Device({
      deviceId: normalizedId,
      macAddress: normalizedId,
      gatewayId,
      roomId: roomId || null,
      customName: customName || null,
      status: 'REGISTERED',
      lastSeen: null,
      lastActive: null,
      sensors: {}
    });
    await device.save();
  }

  // Notify clients
  const io = socketService.getIO();
  if (io) {
    io.emit('device:update', {
      deviceId: device.deviceId,
      macAddress: device.macAddress,
      gatewayId: device.gatewayId,
      roomId: device.roomId,
      customName: device.customName,
      status: device.status,
      lastSeen: device.lastSeen,
    });
    console.log(`[Socket] Emitted device:update for registered device ${device.deviceId}`);
  }

  console.log(`[Device Registration] Successfully registered ${normalizedId}`);
  return { device, isNew };
};

/**
 * Rename a device's customName.
 * @param {string} deviceId - The device's MAC-based ID
 * @param {string} customName - New friendly name
 */
const renameDevice = async (deviceId, customName) => {
  const device = await Device.findOne({ deviceId });
  if (!device) {
    throw new Error('Device not found');
  }

  device.customName = customName || null;
  await device.save();

  // Broadcast update
  const io = socketService.getIO();
  if (io) {
    io.emit('device:update', {
      deviceId: device.deviceId,
      gatewayId: device.gatewayId,
      roomId: device.roomId,
      customName: device.customName,
      lastSeen: device.lastSeen,
    });
    console.log(`[Device] Renamed ${deviceId} → "${customName}"`);
  }

  return device;
};

/**
 * Remove a device from the system.
 * @param {string} deviceId - The device's MAC-based ID
 */
const deleteDevice = async (deviceId) => {
  const device = await Device.findOneAndDelete({ deviceId });
  if (!device) {
    throw new Error('Device not found');
  }

  // Broadcast removal
  const io = socketService.getIO();
  if (io) {
    io.emit('device:removed', { deviceId });
    console.log(`[Device] Removed ${deviceId}`);
  }

  return device;
};

module.exports = {
  startSensorTimeoutChecker,
  getAllDevices,
  registerDevice,
  renameDevice,
  deleteDevice,
};
