import express from 'express';
import { body } from 'express-validator';
import {
  processPayment,
  getPaymentById,
  requestRefund,
  getMyPayments,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Validation rules
const paymentValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('paymentMethod').optional().trim(),
  body('transactionId').optional().trim(),
];

const refundValidation = [
  body('reason').optional().trim(),
];

// All routes require authentication
router.use(authenticate);

router.post('/', paymentValidation, validate, processPayment);
router.get('/my-payments', getMyPayments);
router.get('/:id', getPaymentById);
router.post('/:id/refund', refundValidation, validate, requestRefund);

export default router;

