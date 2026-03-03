import { Server } from 'socket.io';
import { verifyToken } from './config/jwt.js';

let io;

const allowedOrigins = [
  ...(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chargematein.vercel.app',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowedOrigin = allowedOrigins.includes(origin);
    const isVercelPreview = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

    if (isAllowedOrigin || isVercelPreview) {
      return callback(null, true);
    }

    return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, { cors: corsOptions });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Unauthorized'));
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Unauthorized'));
      }
      socket.user = { id: decoded.userId, role: decoded.role };
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join', (chatId) => {
      if (!chatId) return;
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave', (chatId) => {
      if (!chatId) return;
      socket.leave(`chat:${chatId}`);
    });
  });

  return io;
};

export const getIO = () => io;
