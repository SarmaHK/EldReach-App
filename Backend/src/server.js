require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const { initGatewayWebSocket } = require('./services/gatewayWebSocket');
const gatewayManager = require('./services/gatewayManager');
const { initMQTTBroker } = require('./services/mqttService');
const deviceService = require('./services/deviceService');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`EldReach Server is running on port ${PORT} (Bound to 0.0.0.0)`);
  
  // Initialize Socket.IO for frontend clients
  socketService.initSocket(server);

  // Start Gateway WebSocket server on separate port (Port 5001)
  initGatewayWebSocket();

  // Start embedded MQTT Broker for sensor telemetry (Port 1883) if enabled
  if (process.env.ENABLE_MQTT === 'true') {
    initMQTTBroker();
  } else {
    console.log(`[MQTT] Broker is disabled in .env (ENABLE_MQTT=false)`);
  }

  // Start heartbeat timeout checkers
  gatewayManager.startTimeoutChecker();
  deviceService.startSensorTimeoutChecker();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
