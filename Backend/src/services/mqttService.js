const aedes = require('aedes')();
const net = require('net');
const aedesServerFactory = require('aedes-server-factory');
const Device = require('../models/Device');
const DeviceLog = require('../models/DeviceLog');
const Gateway = require('../models/Gateway');
const socketService = require('./socketService');
const securityLogger = require('./logger');

// Authenticate the gateway connecting to the MQTT broker
aedes.authenticate = (client, username, password, callback) => {
  const envUser = process.env.MQTT_USERNAME || 'eldreach_node';
  const envPass = process.env.MQTT_PASSWORD || 'secure_mqtt_password';

  if (username === envUser && password && password.toString() === envPass) {
    callback(null, true);
  } else {
    securityLogger.warn('MQTT connection rejected', {
      clientId: client ? client.id : 'unknown',
      reason: 'Invalid username or password',
    });
    const error = new Error('Auth error');
    error.returnCode = 4; // Bad username or password
    callback(error, false);
  }
};

// Authorize publish: Only allow publishing to eldreach/# topics
aedes.authorizePublish = (client, packet, callback) => {
  if (packet.topic.startsWith('eldreach/')) {
    callback(null); // Allow
  } else {
    callback(new Error('Unauthorized topic')); // Deny
  }
};

// Authorize subscribe: Only allow subscribing to eldreach/# topics
aedes.authorizeSubscribe = (client, subscription, callback) => {
  if (subscription.topic.startsWith('eldreach/')) {
    callback(null, subscription); // Allow
  } else {
    callback(new Error('Unauthorized topic')); // Deny
  }
};

// Handle client connections
aedes.on('client', (client) => {
  console.log(`[MQTT] Client Connected: ${client.id}`);
});

// Handle client disconnections
aedes.on('clientDisconnect', (client) => {
  console.log(`[MQTT] Client Disconnected: ${client.id}`);
});

// Process published messages
aedes.on('publish', async (packet, client) => {
  if (!client) return; // Ignore internal broker messages

  const topic = packet.topic;
  const payloadStr = packet.payload.toString();

  try {
    const payload = JSON.parse(payloadStr);

    // Topic routing
    if (topic.startsWith('eldreach/sensors/') && topic.endsWith('/telemetry')) {
      await handleSensorTelemetry(payload);
    } else if (topic.startsWith('eldreach/sensors/') && topic.endsWith('/status')) {
      await handleSensorStatus(payload);
    } else if (topic.startsWith('eldreach/sensors/') && topic.endsWith('/heartbeat')) {
      await handleSensorHeartbeat(payload);
    } else if (topic.startsWith('eldreach/gateway/') && topic.endsWith('/status')) {
      await handleGatewayStatus(payload);
    } else {
      console.log(`[MQTT] Unhandled topic: ${topic}`);
    }
  } catch (err) {
    // Only log if it's not a standard internal mqtt topic
    if (!topic.startsWith('$SYS')) {
      console.error(`[MQTT] Failed to process payload on topic ${topic}:`, err.message);
    }
  }
});

/**
 * Handle Sensor Telemetry (QoS 0)
 * Payload: { macAddress, presence, breathingRate, timestamp }
 */
async function handleSensorTelemetry(payload) {
  const { macAddress, presence, breathingRate, timestamp } = payload;
  if (!macAddress) return;

  const formattedMac = macAddress.toUpperCase();
  const time = timestamp ? new Date(timestamp) : new Date();

  // 1. Update existing device in MongoDB (upsert safe)
  const device = await Device.findOneAndUpdate(
    { deviceId: formattedMac },
    {
      $set: {
        macAddress: formattedMac,
        lastSeen: time,
        lastActive: presence ? time : undefined,
        'sensors.presence.motionDetected': presence,
        'sensors.presence.breathingBPM': breathingRate,
      },
      $setOnInsert: {
        status: 'REGISTERED',
      }
    },
    { new: true, upsert: true }
  );

  // 2. Save Telemetry Record to DeviceLog
  await DeviceLog.create({
    macAddress: formattedMac,
    presence: !!presence,
    breathingRate: breathingRate || 0,
    timestamp: time,
  });

  // 3. Emit real-time Socket.IO update to Frontend
  const io = socketService.getIO();
  if (io) {
    io.emit('device:update', {
      deviceId: device.deviceId,
      macAddress: device.macAddress,
      status: device.status,
      gatewayId: device.gatewayId,
      customName: device.customName,
      lastSeen: device.lastSeen,
      lastActive: device.lastActive,
      sensors: device.sensors
    });
  }
}

/**
 * Handle Sensor Status Updates (QoS 1)
 * Payload: { macAddress, status, timestamp }
 */
async function handleSensorStatus(payload) {
  const { macAddress, status, timestamp } = payload;
  if (!macAddress || !status) return;

  const formattedMac = macAddress.toUpperCase();
  const time = timestamp ? new Date(timestamp) : new Date();

  const device = await Device.findOneAndUpdate(
    { deviceId: formattedMac },
    { $set: { status: status, lastSeen: time } },
    { new: true }
  );

  if (device) {
    console.log(`[MQTT] Sensor ${formattedMac} status changed to ${status}`);
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

/**
 * Handle Sensor Heartbeat
 * Payload: { macAddress }
 */
async function handleSensorHeartbeat(payload) {
  const { macAddress } = payload;
  if (!macAddress) return;

  const formattedMac = macAddress.toUpperCase();
  await Device.updateOne(
    { deviceId: formattedMac },
    { $set: { lastSeen: new Date() } }
  );
}

/**
 * Handle Gateway Status Updates (QoS 1)
 * Payload: { gatewayId, status, timestamp }
 */
async function handleGatewayStatus(payload) {
  const { gatewayId, status, timestamp } = payload;
  if (!gatewayId || !status) return;

  const time = timestamp ? new Date(timestamp) : new Date();

  await Gateway.updateOne(
    { gatewayId: gatewayId },
    { $set: { status: status, lastSeen: time } },
    { upsert: true }
  );
  console.log(`[MQTT] Gateway ${gatewayId} status updated to ${status}`);
}

/**
 * Initialize the Aedes MQTT Broker
 */
function initMQTTBroker() {
  const port = process.env.MQTT_PORT || 1883;
  const server = aedesServerFactory.createServer(aedes);

  server.listen(port, function () {
    console.log(`[MQTT] Broker listening on port ${port} (Bound to 0.0.0.0)`);
  });

  return aedes;
}

module.exports = {
  initMQTTBroker,
};
