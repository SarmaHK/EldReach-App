const DeviceLog = require('../models/DeviceLog');

/**
 * Log device sensor data to the history collection.
 * This is an append-only operation for time-series analysis.
 */
const logDeviceData = async ({ deviceId, sensors, processed }) => {
  try {
    // Only log if there's actual sensor data
    if (!sensors) return;

    await DeviceLog.create({
      deviceId,
      sensors,
      processed: processed || {},
      timestamp: new Date()
    });

  } catch (error) {
    console.error(`[LogService] Failed to log device data for ${deviceId}:`, error.message);
  }
};

module.exports = {
  logDeviceData,
};
