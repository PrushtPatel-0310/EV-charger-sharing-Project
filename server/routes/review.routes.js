import express from 'express';
import { body } from 'express-validator';
import {
  createReview,
  getChargerReviews,
  getUserReviews,
  updateReview,
  deleteReview,
} from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Validation rules
const reviewValidation = [
  body('bookingId').notEmpty().withMessage('Booking ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters'),
];

// Public routes
router.get('/charger/:chargerId', getChargerReviews);
router.get('/user/:userId', getUserReviews);

// Protected routes
router.post('/', authenticate, reviewValidation, validate, createReview);
router.put('/:id', authenticate, validate, updateReview);
router.delete('/:id', authenticate, deleteReview);

export default router;

