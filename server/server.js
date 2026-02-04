import 'dotenv/config';

// import dotenv from 'dotenv';
// dotenv.config();
// require('dotenv').config();

import http from 'http';
import express from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import chargerRoutes from './routes/charger.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import chatRoutes from './routes/chat.routes.js';
import reviewRoutes from './routes/review.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import aiRoutes from './routes/ai.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import Booking from './models/Booking.js';
import slotRoutes from './routes/slot.routes.js';
import { initSocket } from './socket.js';

// Load environment variables

console.log("ENV CHECK:", {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
  secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING",
});
// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration (must be before other middleware)
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Note: Body parsing for JSON must come after CORS but before routes
// Multer will handle multipart/form-data in the upload routes

app.use(cors(corsOptions));

// Security middleware (configured to work with CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting (enabled in production only to avoid throttling local dev)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // allow a higher burst in production
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);
}

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(logger);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/chargers', chargerRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/chargers/:chargerId/slots', slotRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Auto-checkout bookings whose slots have ended
const AUTO_CHECK_INTERVAL_MS = 60 * 1000;

const autoCheckoutExpiredBookings = async () => {
  try {
    const now = new Date();
    const result = await Booking.updateMany(
      { status: 'active', endTime: { $lt: now } },
      { status: 'completed', checkOutTime: now }
    );

    if (result.modifiedCount > 0) {
      console.log(`Auto-checkout: completed ${result.modifiedCount} expired booking(s)`);
    }
  } catch (err) {
    console.error('Auto-checkout error:', err.message);
  }
};

setInterval(autoCheckoutExpiredBookings, AUTO_CHECK_INTERVAL_MS);

