import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getTransactions } from '../controllers/walletController.js';

const router = express.Router();

router.use(authenticate);

router.get('/transactions', getTransactions);

export default router;
