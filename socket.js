// socket.js
const { Server } = require('socket.io');
let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', socket => {
    console.log('🔌 Client connected:', socket.id);
    socket.emit('hello', 'Connected to server successfully');
    console.log(`📡 Sent hello message to client: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO chưa được khởi tạo');
  return io;
}

module.exports = { initSocket, getIO };
