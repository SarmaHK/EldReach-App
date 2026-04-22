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

// Main Device schema
const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      unique: true,
      trim: true,
    },
    gatewayId: {
      type: String,
      trim: true,
      default: null,
    },
    roomId: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'inactive',
    },
    sensors: {
      type: sensorsSchema,
      default: () => ({}),
    },
    processed: {
      filteredTargets: {
        type: [radarTargetSchema],
        default: [],
      },
      movementPath: {
        type: [
          {
            x: Number,
            y: Number,
            timestamp: Date,
          },
        ],
        default: [],
      },
      fallDetected: {
        type: Boolean,
        default: false,
      },
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Device', deviceSchema);
