const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for now
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    console.warn('Socket.io is not initialized! (getIO)');
    return null;
  }
  return io;
};

const emitToAll = (event, data) => {
  if (!io) {
    console.warn('Socket.io is not initialized! Cannot emit:', event);
    return;
  }
  io.emit(event, data);
};

module.exports = {
  initSocket,
  getIO,
  emitToAll,
};
