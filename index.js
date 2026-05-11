// index.js
const http = require('http');
const { Server } = require('socket.io');
const { io: ClientIO } = require('socket.io-client');

const TARGET_WS = 'ws://us2.bot-hosting.net:21892';
const PORT = process.env.PORT || 3000;

// HTTP сервер (для Socket.IO)
const server = http.createServer();

// Socket.IO сервер для клієнтів (WSS)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']
});

io.on('connection', (clientSocket) => {
  console.log('🔌 Client connected:', clientSocket.id);

  // Підключаємося до цільового WS сервера
  const targetSocket = ClientIO(TARGET_WS, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
    timeout: 10000
  });

  targetSocket.on('connect', () => {
    console.log('✅ Connected to target WS server');
  });

  targetSocket.on('connect_error', (err) => {
    console.error('❌ Connection error to target WS:', err.message);
    targetSocket.disconnect();
  });

  targetSocket.on('disconnect', (reason) => {
    console.log('Target WS server disconnected:', reason);
  });

  // Проксі: client → target
  clientSocket.onAny((event, ...args) => {
    if (targetSocket.connected) {
      targetSocket.emit(event, ...args);
    }
  });

  // Проксі: target → client
  targetSocket.onAny((event, ...args) => {
    clientSocket.emit(event, ...args);
  });

  clientSocket.on('disconnect', () => {
    console.log('❌ Client disconnected:', clientSocket.id);
    targetSocket.disconnect();
  });
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`✅ WS Proxy running on port ${PORT}`);
});
