const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: [true, 'roomId is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    trim: true,
  },
  boundary: {
    type: [pointSchema],
    default: [],
  },
  mappingInProgress: {
    type: Boolean,
    default: false,
  },
  collectedPoints: {
    type: [pointSchema],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', roomSchema);
