const Device = require('../models/Device');
const { createAlert } = require('./alertService');
const socketService = require('./socketService');
const logService = require('./logService');
const { processSensorData } = require('./processingService');

// Inactivity threshold: 1 minute (will be configurable later)
const INACTIVITY_LIMIT = 60 * 1000;

/**
 * Create or update a device with sensor data,
 * then evaluate inactivity state.
 */
const updateDevice = async (data) => {
  const { nodeId, gatewayId, roomId, sensors } = data;
  const now = new Date();

  // Fetch the current device state BEFORE updating (to detect state changes)
  const previousDevice = await Device.findOne({ deviceId: nodeId });
  const previousStatus = previousDevice ? previousDevice.status : null;

  // Build the update fields
  const updateFields = {
    lastSeen: now,
    status: 'active', // Device is actively sending data
    lastActive: now,
  };

  if (gatewayId) {
    updateFields.gatewayId = gatewayId;
  }

  if (roomId) {
    updateFields.roomId = roomId;
  }

  if (sensors) {
    // Overwrite the sensors with the latest snapshot. We do not append targets.
    updateFields.sensors = sensors;
  }

  // Process sensor data (intelligence layer)
  if (sensors) {
    let roomBoundary = [];
    if (previousDevice && previousDevice.roomId) {
      const room = await require('../models/Room').findOne({ roomId: previousDevice.roomId });
      if (room && room.boundary && room.boundary.length >= 3) {
        roomBoundary = room.boundary;
      }
    }

    const processed = processSensorData(previousDevice, sensors, roomBoundary);
    updateFields.processed = processed;

    if (processed.fallDetected) {
      await createAlert({
        deviceId: nodeId,
        type: 'fall',
        message: 'Possible fall detected',
      });
    }
  }

  // Upsert the device
  let device = await Device.findOneAndUpdate(
    { deviceId: nodeId },
    { 
      $set: updateFields,
      $setOnInsert: { deviceId: nodeId }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  // Evaluate inactivity after the update
  device = await checkInactivity(device, previousStatus);

  // Emit real-time update
  try {
    socketService.getIO().emit('device:update', device);
  } catch (error) {
    console.warn('Socket.IO not initialized, skipping emit');
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
 * Check if a device should be marked inactive
 * based on how long since it was last active.
 *
 * Only evaluates if lastActive exists (device has been active before).
 * Only creates an alert on state CHANGE (active → inactive), not repeatedly.
 */
const checkInactivity = async (device, previousStatus) => {
  // Skip if device has never been active
  if (!device.lastActive) {
    return device;
  }

  // Skip if already inactive (no state change possible)
  if (device.status === 'inactive') {
    return device;
  }

  const now = new Date();
  const timeSinceActive = now.getTime() - device.lastActive.getTime();

  if (timeSinceActive > INACTIVITY_LIMIT) {
    device.status = 'inactive';
    await device.save();

    // Only create alert if this is a STATE CHANGE (was active, now inactive)
    if (previousStatus === 'active') {
      await createAlert({
        deviceId: device.deviceId,
        type: 'inactivity',
        message: `No activity detected for ${Math.round(timeSinceActive / 1000)} seconds`,
      });
    }

    console.log(`[Inactivity] Device ${device.deviceId} marked inactive (idle for ${Math.round(timeSinceActive / 1000)}s)`);
  }

  return device;
};

/**
 * Get all devices, sorted by most recent lastSeen.
 */
const getAllDevices = async () => {
  return Device.find().sort({ lastSeen: -1 });
};

module.exports = {
  updateDevice,
  getAllDevices,
};
