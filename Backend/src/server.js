require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const { initMqttClient } = require('./mqtt/mqttClient');
const gatewayRoutes = require('./routes/gatewayRoutes');

// Connect to MongoDB
connectDB();

// Register Gateway Routes
app.use('/api/gateway', gatewayRoutes);

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for now
  },
});

// Set IO instance in service
socketService.setIO(io);

// Initialize MQTT Client


if (process.env.ENABLE_MQTT === "true") {
  require("./mqtt/mqttClient");
}


// Handle client connections
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`EldReach Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
