import express from 'express';
import { body } from 'express-validator';
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  checkIn,
  checkOut,
  getUpcomingBookings,
  getPastBookings,
  getMyRentals,
} from '../controllers/booking.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Validation rules
const bookingValidation = [
  body('chargerId').notEmpty().withMessage('Charger ID is required'),
  body().custom((value) => {
    const hasSlots = Array.isArray(value.slots) && value.slots.length > 0;
    const hasRange = Boolean(value.startTime) && Boolean(value.endTime);
    if (!hasSlots && !hasRange) {
      throw new Error('Provide either slots array or start/end time');
    }
    return true;
  }),
  body('slots').optional().isArray({ min: 1 }).withMessage('Slots must be an array'),
  body('slots.*.start').optional().isISO8601().withMessage('Slot start must be ISO date'),
  body('slots.*.end').optional().isISO8601().withMessage('Slot end must be ISO date'),
  body('startTime').optional().isISO8601().withMessage('Start time must be ISO date'),
  body('endTime').optional().isISO8601().withMessage('End time must be ISO date'),
];

// All routes require authentication
router.use(authenticate);

router.post('/', bookingValidation, validate, createBooking);
router.get('/', getBookings);
router.get('/upcoming', getUpcomingBookings);
router.get('/past', getPastBookings);
router.get('/my-rentals', getMyRentals);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);
router.put('/:id/checkin', checkIn);
router.put('/:id/checkout', checkOut);

export default router;

