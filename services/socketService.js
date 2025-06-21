// socket.js
const { Server } = require('socket.io');
let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "https://mine-bot-91lpojb9w-bawgitnes-projects.vercel.app", // ✅ Đã sửa trắng + thêm https
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket"],   
    pingTimeout: 30000,           
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
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocket, getIO };
