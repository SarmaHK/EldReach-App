const Alert = require('../models/Alert');
const socketService = require('./socketService');

/**
 * Create a new alert in the database.
 */
const createAlert = async ({ deviceId, type, message }) => {
  const alert = await Alert.create({
    deviceId,
    type,
    message,
  });

  console.log(`[Alert] ${type} alert created for device ${deviceId}`);

  try {
    socketService.getIO().emit('alert:new', alert);
  } catch (error) {
    console.warn('Socket.IO not initialized, skipping emit');
  }

  return alert;
};

/**
 * Get all alerts, sorted by most recent first.
 */
const getAllAlerts = async () => {
  return Alert.find().sort({ createdAt: -1 });
};

module.exports = {
  createAlert,
  getAllAlerts,
};
