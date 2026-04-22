let io;

const setIO = (ioInstance) => {
  io = ioInstance;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};

module.exports = {
  setIO,
  getIO,
};
