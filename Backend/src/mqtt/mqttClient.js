const mqtt = require('mqtt');
const deviceService = require('../services/deviceService');

// Connect to MQTT Broker (Using local broker for now)
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC = 'eldreach/devices/+/data';

const initMqttClient = () => {
  const client = mqtt.connect(MQTT_BROKER_URL);

  client.on('connect', () => {
    console.log(`[MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
    
    client.subscribe(MQTT_TOPIC, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to topic ${MQTT_TOPIC}:`, err);
      } else {
        console.log(`[MQTT] Subscribed to topic: ${MQTT_TOPIC}`);
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      
      // We expect the payload to include deviceId, status, and sensors
      const { deviceId, status, sensors } = payload;
      
      if (!deviceId) {
        console.warn(`[MQTT] Ignored message without deviceId on topic ${topic}`);
        return;
      }

      // Forward to service layer. Logic is handled entirely by deviceService
      await deviceService.updateDeviceData({ deviceId, status, sensors });
      
    } catch (error) {
      console.error(`[MQTT] Failed to process message on topic ${topic}:`, error.message);
    }
  });

  client.on('error', (err) => {
    console.error('[MQTT] Connection error:', err);
  });

  return client;
};

module.exports = {
  initMqttClient,
};
