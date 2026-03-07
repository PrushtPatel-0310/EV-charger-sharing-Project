import express from 'express';
import Stripe from 'stripe';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import { createTransaction } from '../controllers/walletController.js';

const router = express.Router();

const ensureStripeKeys = () => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
    const error = new Error('Stripe keys are not configured');
    error.statusCode = 500;
    throw error;
  }
};

let stripe;
const getStripe = () => {
  ensureStripeKeys();
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

const normalizeUrl = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`.replace(/\/$/, '');
  } catch {
    return null;
  }
};

const getFrontendBaseUrl = (req) => {
  const configuredFrontend = normalizeUrl(process.env.FRONTEND_URL);
  const configuredClient = normalizeUrl(process.env.CLIENT_URL);
  const configuredApp = normalizeUrl(process.env.APP_URL);
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => normalizeUrl(value))
    .filter(Boolean);

  const configuredCandidates = [
    configuredFrontend,
    configuredClient,
    configuredApp,
    ...corsOrigins,
  ].filter(Boolean);

  const requestOrigin = normalizeUrl(req.get('origin'));
  const isTrustedRequestOrigin = requestOrigin && configuredCandidates.includes(requestOrigin);

  if (isTrustedRequestOrigin) {
    return requestOrigin;
  }

  // If no explicit frontend URL is configured, use request origin as a safe runtime fallback.
  if (!configuredCandidates.length && requestOrigin) {
    return requestOrigin;
  }

  if (configuredCandidates.length) {
    return configuredCandidates[0];
  }

  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Frontend URL is not configured. Set FRONTEND_URL or CORS_ORIGINS in backend env.');
    error.statusCode = 500;
    throw error;
  }

  return 'http://localhost:5173';
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return null;
};

router.post(
  '/create-checkout-session',
  authenticate,
  [body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0')],
  async (req, res, next) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    try {
      const stripeClient = getStripe();
      const amount = Number(req.body.amount);
      const amountInPaise = Math.round(amount * 100);
      const frontendBaseUrl = getFrontendBaseUrl(req);

      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: 'EV Charger Wallet Top-up',
                description: `Wallet recharge of ₹${amount.toFixed(2)}`,
              },
              unit_amount: amountInPaise,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: req.user._id.toString(),
          type: 'wallet_topup',
        },
        success_url: `${frontendBaseUrl}/profile?walletTopup=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendBaseUrl}/profile?walletTopup=cancelled`,
      });

      return res.json({
        success: true,
        data: {
          sessionId: session.id,
          checkoutUrl: session.url,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/verify-session',
  authenticate,
  [
    body('sessionId').notEmpty().withMessage('Session ID is required'),
    body('userId').optional().isString(),
  ],
  async (req, res, next) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const { sessionId, userId } = req.body;

    try {
      const stripeClient = getStripe();
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Payment is not completed' });
      }

      if (session.metadata?.type !== 'wallet_topup') {
        return res.status(400).json({ success: false, message: 'Invalid payment session type' });
      }

      const creditedAmount = (session.amount_total ?? 0) / 100;

      if (!creditedAmount || Number.isNaN(creditedAmount)) {
        return res.status(400).json({ success: false, message: 'Invalid payment amount' });
      }

      const targetUserId = (userId || req.user._id).toString();
      if (targetUserId !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized wallet update' });
      }

      const sessionUserId = session.metadata?.userId?.toString();
      if (sessionUserId && sessionUserId !== targetUserId) {
        return res.status(403).json({ success: false, message: 'Payment session user mismatch' });
      }

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: targetUserId,
          processedStripeSessions: { $ne: sessionId },
        },
        {
          $inc: { walletBalance: creditedAmount },
          $addToSet: { processedStripeSessions: sessionId },
        },
        { new: true }
      ).select('-password -refreshToken');

      if (!updatedUser) {
        const currentUser = await User.findById(targetUserId).select('-password -refreshToken');
        if (!currentUser) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.json({
          success: true,
          message: 'Payment already verified',
          data: {
            walletBalance: currentUser.walletBalance,
            user: currentUser,
            session,
          },
        });
      }

      await createTransaction(
        targetUserId,
        creditedAmount,
        'CREDIT',
        'Recharge',
        `Wallet top-up via Stripe (Stripe session: ${sessionId})`,
        'Success'
      );

      return res.json({
        success: true,
        message: 'Wallet topped up successfully',
        data: {
          walletBalance: updatedUser.walletBalance,
          user: updatedUser,
          session,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

// Dummy payment endpoint for testing without gateway
router.post(
  '/dummy-charge',
  authenticate,
  [
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod').optional().isIn(['card', 'upi']).withMessage('Invalid payment method'),
    body('reference').optional().trim(),
  ],
  async (req, res, next) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    try {
      const amount = Number(req.body.amount);
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { walletBalance: amount } },
        { new: true }
      ).select('-password -refreshToken');

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await createTransaction(
        req.user._id,
        amount,
        'CREDIT',
        'Recharge',
        `Wallet top-up via dummy ${req.body.paymentMethod || 'card'} (${req.body.reference || 'dummy'})`,
        'Success'
      );

      return res.json({
        success: true,
        message: 'Dummy payment processed and wallet updated',
        data: {
          walletBalance: updatedUser.walletBalance,
          user: updatedUser,
          payment: {
            amount,
            paymentMethod: req.body.paymentMethod || 'card',
            reference: req.body.reference || 'dummy',
            status: 'success',
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
