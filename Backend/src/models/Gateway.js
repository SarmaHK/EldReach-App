const mongoose = require('mongoose');

/**
 * Gateway model — represents a physical EldReach gateway hub
 * that connects to the backend via WebSocket.
 *
 * The gatewayId is the unique identifier for the gateway
 * (typically the MAC address). systemId identifies the
 * household/installation the gateway belongs to.
 *
 * Gateway is NOT a device — it acts as a bridge between
 * sensor nodes and this backend. Devices (nodes) flow through
 * the existing deviceService pipeline unchanged.
 */
const gatewaySchema = new mongoose.Schema(
  {
    gatewayId: {
      type: String,
      required: [true, 'gatewayId is required'],
      unique: true,
      trim: true,
    },
    systemId: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE'],
      default: 'OFFLINE',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Gateway', gatewaySchema);
