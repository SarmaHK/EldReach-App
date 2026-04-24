const express = require('express');
const cors = require('cors');

// Initialize express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic route to check if server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'EldReach Backend is running successfully!' });
});

// Routes
const deviceRoutes = require('./routes/deviceRoutes');
const alertRoutes = require('./routes/alertRoutes');
const roomRoutes = require('./routes/roomRoutes');
const gatewayRoutes = require('./routes/gatewayRoutes');
app.use('/api/devices', deviceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/gateway', gatewayRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
