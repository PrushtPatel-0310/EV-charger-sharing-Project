import express from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateProfile,
  changePassword,
  verifySignup,
  verifyLoginOtp,
  requestPasswordChangeOtp,
  forgotPassword,
  resetPassword,
  requestEmailChange,
  verifyEmailChange,
  requestProfileUpdateOtp,
  verifyProfileUpdateOtp,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().trim(),
  body('role').optional().isIn(['owner', 'renter', 'both']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('otp').isNumeric().withMessage('OTP must be numeric'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const verifyLoginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('otp').isNumeric().withMessage('OTP must be numeric'),
];

const signupVerifyValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('otp').isNumeric().withMessage('OTP must be numeric'),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('otp').isNumeric().withMessage('OTP must be numeric'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const requestEmailChangeValidation = [
  body('userId').notEmpty().withMessage('User id is required'),
  body('newEmail').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyEmailChangeValidation = [
  body('userId').notEmpty().withMessage('User id is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('otp').isNumeric().withMessage('OTP must be numeric'),
];

const requestProfileUpdateOtpValidation = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['owner', 'renter', 'both']).withMessage('Invalid role'),
];

const verifyProfileUpdateOtpValidation = [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('otp').isNumeric().withMessage('OTP must be numeric'),
];

// Routes
router.post('/register', registerValidation, validate, register);
router.post('/register/verify', signupVerifyValidation, validate, verifySignup);
router.post('/login', loginValidation, validate, login);
router.post('/login/verify', verifyLoginValidation, validate, verifyLoginOtp);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePasswordValidation, validate, changePassword);
router.post('/password/otp', authenticate, requestPasswordChangeOtp);
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', resetPasswordValidation, validate, resetPassword);
router.post('/request-email-change', requestEmailChangeValidation, validate, requestEmailChange);
router.post('/verify-email-change', verifyEmailChangeValidation, validate, verifyEmailChange);
router.post('/profile/otp/request', authenticate, requestProfileUpdateOtpValidation, validate, requestProfileUpdateOtp);
router.post('/profile/otp/verify', authenticate, verifyProfileUpdateOtpValidation, validate, verifyProfileUpdateOtp);

export default router;

