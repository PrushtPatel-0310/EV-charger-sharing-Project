import express from 'express';
import { body } from 'express-validator';
import {
  getRecommendations,
  getPriceSuggestion,
  chat,
  getAnalytics,
} from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { isOwner } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Validation rules
const recommendationsValidation = [
  body('location.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('location.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('endTime').optional().isISO8601().withMessage('Valid end time is required'),
];

const priceSuggestionValidation = [
  body('chargerId').notEmpty().withMessage('Charger ID is required'),
  body('context').optional().isObject(),
];

const chatValidation = [
  body('message').trim().notEmpty().withMessage('Message is required'),
];

// All routes require authentication
router.use(authenticate);

router.post('/recommendations', recommendationsValidation, validate, getRecommendations);
router.post('/price-suggestion', priceSuggestionValidation, validate, isOwner, getPriceSuggestion);
router.post('/chat', chatValidation, validate, chat);
router.get('/analytics/:chargerId', isOwner, getAnalytics);

export default router;

