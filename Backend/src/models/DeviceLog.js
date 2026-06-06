const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
  macAddress: {
    type: String,
    required: [true, 'macAddress is required'],
    trim: true,
    uppercase: true,
  },
  presence: {
    type: Boolean,
    required: true,
    default: false,
  },
  breathingRate: {
    type: Number,
    default: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient time-series queries
deviceLogSchema.index({ macAddress: 1, timestamp: -1 });

module.exports = mongoose.model('DeviceLog', deviceLogSchema);
