const mappingService = require('../services/mappingService');
const Room = require('../models/Room');

const startMapping = async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ status: 'error', message: 'roomId is required' });
    }
    const room = await mappingService.startMapping(roomId);
    res.status(200).json({ status: 'success', data: room });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const stopMapping = async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) {
      return res.status(400).json({ status: 'error', message: 'roomId is required' });
    }
    const room = await mappingService.stopMapping(roomId);
    res.status(200).json({ status: 'success', data: room });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({ status: 'success', count: rooms.length, data: rooms });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  startMapping,
  stopMapping,
  getRooms,
};
