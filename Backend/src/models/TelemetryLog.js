const mongoose = require('mongoose');

const targetSchema = new mongoose.Schema(
  {
    id: { type: Number },
    x: { type: Number },
    y: { type: Number },
    z: { type: Number },
    speed: { type: Number },
    alarm: { type: Number },
  },
  { _id: false }
);

const telemetryLogSchema = new mongoose.Schema({
  gatewayId: {
    type: String,
    required: [true, 'gatewayId is required'],
    trim: true,
  },
  systemId: {
    type: String,
    trim: true,
    default: null,
  },
  targets: {
    type: [targetSchema],
    default: [],
  },
  type: {
    type: String,
    default: 'TELEMETRY_STREAM',
  },
  signature: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient time-series queries
telemetryLogSchema.index({ gatewayId: 1, timestamp: -1 });

module.exports = mongoose.model('TelemetryLog', telemetryLogSchema);
