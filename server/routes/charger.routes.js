import express from 'express';
import { body } from 'express-validator';
import {
  getAllChargers,
  searchChargers,
  getChargerById,
  createCharger,
  updateCharger,
  deleteCharger,
  getMyChargers,
  checkAvailability,
  disableCharger,
} from '../controllers/charger.controller.js';
import { authenticate, authenticateOptional } from '../middleware/auth.middleware.js';
import { isOwner } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Validation rules
const chargerValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('location.address').notEmpty().withMessage('Address is required'),
  body('location.city').notEmpty().withMessage('City is required'),
  body('location.state').notEmpty().withMessage('State is required'),
  body('location.zipCode').notEmpty().withMessage('Zip code is required'),
  body('location.coordinates.lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude is required'),
  body('location.coordinates.lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude is required'),
  body('chargerType').isIn(['Level 1', 'Level 2', 'DC Fast']).withMessage('Valid charger type is required'),
  body('connectorType').isIn(['Type 1', 'Type 2', 'CCS', 'CHAdeMO', 'Tesla']).withMessage('Valid connector type is required'),
  body('powerOutput').isFloat({ min: 0 }).withMessage('Valid power output is required'),
  body('pricePerHour').isFloat({ min: 0 }).withMessage('Valid price per hour is required'),
];

// Public routes
router.get('/', authenticateOptional, getAllChargers);
router.get('/search', authenticateOptional, searchChargers);
// Protected list of owner's chargers must be declared before the dynamic :id route
router.get('/my-chargers', authenticate, isOwner, getMyChargers);
router.get('/:id', getChargerById);
router.get('/:id/availability', checkAvailability);
router.post(
  '/:id/disable',
  authenticate,
  isOwner,
  [
    body('mode').isIn(['temporary', 'permanent']).withMessage('Mode must be temporary or permanent'),
    body('startDate').optional().isISO8601().withMessage('Start date must be ISO date'),
    body('endDate').optional().isISO8601().withMessage('End date must be ISO date'),
  ],
  validate,
  disableCharger
);

// Protected routes
router.post('/', authenticate, isOwner, chargerValidation, validate, createCharger);
router.put('/:id', authenticate, isOwner, chargerValidation, validate, updateCharger);
router.delete('/:id', authenticate, isOwner, deleteCharger);

export default router;

