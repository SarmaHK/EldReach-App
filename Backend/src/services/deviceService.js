const Device = require('../models/Device');
const Gateway = require('../models/Gateway');
const axios = require('axios');
const { createAlert } = require('./alertService');
const socketService = require('./socketService');
const logService = require('./logService');
const { processSensorData } = require('./processingService');

/**
 * Handle incoming ESP32 telemetry data
 */
const handleIncomingData = async (data) => {
  const { deviceId, gatewayId, sensors } = data;
  const now = new Date();

  // Normalize deviceId
  const normalizedDeviceId = deviceId ? deviceId.toUpperCase() : null;

  if (!normalizedDeviceId) {
    throw new Error('deviceId is required');
  }

  // Fetch the current device state
  console.log(`[DeviceService] Matching device with ID: ${normalizedDeviceId}`);
  let device = await Device.findOne({ deviceId: normalizedDeviceId });

  if (!device) {
    console.log(`[DeviceService] Unknown device: ${normalizedDeviceId}`);
    return null;
  }
  
  console.log(`[DeviceService] Device matched successfully: ${device._id}`);

  // Build the update fields
  const updateFields = {
    lastSeen: now,
    lastActive: now,
  };

  if (gatewayId) {
    updateFields.gatewayId = gatewayId;
    
    // Update Gateway heartbeat
    const gatewayDoc = await Gateway.findOneAndUpdate(
      { gatewayId },
      { $set: { lastSeen: now, status: 'online' } },
      { new: true, upsert: true }
    );
    
    const io = socketService.getIO();
    if (io && gatewayDoc) {
      io.emit('gateway:status', {
        gatewayId: gatewayDoc.gatewayId,
        ip: gatewayDoc.ip,
        status: gatewayDoc.status,
        lastSeen: gatewayDoc.lastSeen,
      });
    }
  }

  if (sensors) {
    // Overwrite the sensors with the latest snapshot. We do not append targets.
    updateFields.sensors = sensors;
  }

  // Process sensor data (intelligence layer)
  if (sensors) {
    let roomBoundary = [];
    if (device.roomId) {
      const room = await require('../models/Room').findOne({ roomId: device.roomId });
      if (room && room.boundary && room.boundary.length >= 3) {
        roomBoundary = room.boundary;
      }
    }

    const processed = processSensorData(device, sensors, roomBoundary);
    updateFields.processed = processed;

    if (processed.fallDetected) {
      await createAlert({
        deviceId: normalizedDeviceId,
        type: 'fall',
        message: 'Possible fall detected',
      });
    }
  }

  // Update the device
  device = await Device.findOneAndUpdate(
    { deviceId: normalizedDeviceId },
    { $set: updateFields },
    {
      new: true,
      runValidators: true,
    }
  );

  // Emit real-time update
  console.log(`[DeviceService] Device updated successfully in DB: ${normalizedDeviceId}`);
  const io = socketService.getIO();
  if (io) {
    io.emit('device:update', device);
    console.log(`[Socket] Emitted device:update for ${device.deviceId}`);
  }

  // Check if mapping is in progress and collect points
  const activeRoom = await require('../models/Room').findOne({ mappingInProgress: true });
  if (activeRoom && sensors && sensors.radar && sensors.radar.targets) {
    await require('./mappingService').collectPoint(activeRoom.roomId, sensors.radar.targets);
  }

  // Fire-and-forget logging to history collection
  logService.logDeviceData({
    deviceId: device.deviceId,
    sensors: device.sensors,
    processed: device.processed,
  }).catch(console.error);

  return device;
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
  
  // ── Step 1: Link with Physical Gateway ──
  const gateway = await Gateway.findOne({ gatewayId });
  if (!gateway) {
    throw new Error('HOME_HUB_NOT_FOUND');
  }

  const rawMac = normalizedId.replace(/:/g, "").toUpperCase();
  console.log(`[Device Registration] Sending MAC ${rawMac} to gateway at ${gateway.ip}`);

  try {
    const response = await axios.get(`http://${gateway.ip}/link-sensor?mac=${rawMac}`, { timeout: 5000 });
    console.log(`[Device Registration] Gateway response:`, response.data);
  } catch (err) {
    console.error(`[Device Registration] Gateway connection failed:`, err.message);
    throw new Error('GATEWAY_LINK_FAILED');
  }

  // ── Step 2: Save to Database ──
  let device = await Device.findOne({ deviceId: normalizedId });
  let isNew = false;
  
  if (device) {
    device.gatewayId = gatewayId;
    if (roomId) device.roomId = roomId;
    if (customName !== undefined) device.customName = customName;
    device.lastSeen = null;
    await device.save();
  } else {
    isNew = true;
    device = new Device({
      deviceId: normalizedId,
      gatewayId,
      roomId: roomId || null,
      customName: customName || null,
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
      gatewayId: device.gatewayId,
      roomId: device.roomId,
      customName: device.customName,
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
  handleIncomingData,
  getAllDevices,
  registerDevice,
  renameDevice,
  deleteDevice,
};
