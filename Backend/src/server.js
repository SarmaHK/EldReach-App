require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const { startGatewayHeartbeat } = require('./services/gatewayHeartbeat');
const gatewayRoutes = require('./routes/gatewayRoutes');

// Connect to MongoDB
connectDB();

// Register Gateway Routes
app.use('/api/gateway', gatewayRoutes);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Socket.IO is initialized after server.listen()
// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`EldReach Server is running on port ${PORT} (Bound to 0.0.0.0)`);
  
  // Initialize Socket.IO after server starts listening
  socketService.initSocket(server);

  // Start gateway health monitoring
  startGatewayHeartbeat();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
