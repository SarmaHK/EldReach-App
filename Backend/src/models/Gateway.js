const mongoose = require('mongoose');

/**
 * Gateway model — represents a physical EldReach gateway hub
 * discovered via mDNS on the local network.
 *
 * The gatewayId is the MAC address returned by the gateway's
 * /get-system-id endpoint, ensuring a stable unique identifier
 * even when the IP changes between reboots.
 *
 * Gateway is NOT a device — it acts as a bridge between
 * sensor nodes and this backend. Devices (nodes) flow through
 * the existing deviceService pipeline unchanged.
 */
const gatewaySchema = new mongoose.Schema(
  {
    gatewayId: {
      type: String,
      required: [true, 'gatewayId (MAC address) is required'],
      unique: true,
      trim: true,
    },
    ip: {
      type: String,
      required: [true, 'Gateway IP address is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Gateway', gatewaySchema);
