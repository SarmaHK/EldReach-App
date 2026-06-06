require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const { initGatewayWebSocket } = require('./services/gatewayWebSocket');
const gatewayManager = require('./services/gatewayManager');

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

  // Start Gateway WebSocket server on separate port
  initGatewayWebSocket();

  // Start heartbeat timeout checker
  gatewayManager.startTimeoutChecker();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
