const mongoose = require('mongoose');

// Sub-schema for individual radar targets
const radarTargetSchema = new mongoose.Schema(
  {
    x: { type: Number },
    y: { type: Number },
    velocity: { type: Number },
    distance: { type: Number },
  },
  { _id: false }
);

// Sub-schema for radar sensor data
const radarSchema = new mongoose.Schema(
  {
    targets: [radarTargetSchema],
  },
  { _id: false }
);

// Sub-schema for presence sensor data
const presenceSchema = new mongoose.Schema(
  {
    motionDetected: { type: Boolean },
    breathingDetected: { type: Boolean },
  },
  { _id: false }
);

// Sub-schema for raw sensor data
const sensorsSchema = new mongoose.Schema(
  {
    radar: { type: radarSchema, default: () => ({}) },
    presence: { type: presenceSchema, default: () => ({}) },
  },
  { _id: false }
);

const deviceLogSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'deviceId is required'],
    trim: true,
  },
  sensors: {
    type: sensorsSchema,
    default: () => ({}),
  },
  processed: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient time-series queries
deviceLogSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('DeviceLog', deviceLogSchema);
