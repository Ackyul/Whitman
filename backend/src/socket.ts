import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { db } from './store.js';

let io: SocketIOServer | null = null;

export function initSocket(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Whitman Realtime] Cliente conectado: ${socket.id}`);

    // Enviar estadísticas iniciales de inmediato al conectarse
    socket.emit('stats:update', db.getStats());

    socket.on('disconnect', () => {
      console.log(`[Whitman Realtime] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado aún.');
  }
  return io;
}

