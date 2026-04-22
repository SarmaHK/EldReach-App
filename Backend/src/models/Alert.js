const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'deviceId is required'],
    trim: true,
  },
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    trim: true,
  },
  message: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('Alert', alertSchema);
