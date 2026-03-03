import Transaction from '../models/Transaction.js';
import { ValidationError } from '../utils/errors.js';

const VALID_TYPES = ['CREDIT', 'DEBIT'];
const VALID_CATEGORIES = ['Recharge', 'Booking', 'Refund', 'Withdrawal'];
const VALID_STATUS = ['Success', 'Pending', 'Failed'];

export const createTransaction = async (
  userId,
  amount,
  type,
  category,
  description = '',
  status = 'Success'
) => {
  if (!userId) {
    throw new ValidationError('User is required for a transaction');
  }
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    throw new ValidationError('Amount must be a valid number');
  }
  if (!VALID_TYPES.includes(type)) {
    throw new ValidationError(`Invalid transaction type: ${type}`);
  }
  if (!VALID_CATEGORIES.includes(category)) {
    throw new ValidationError(`Invalid transaction category: ${category}`);
  }
  if (!VALID_STATUS.includes(status)) {
    throw new ValidationError(`Invalid transaction status: ${status}`);
  }

  return Transaction.create({
    user: userId,
    amount,
    type,
    category,
    status,
    description,
  });
};

export const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id })
      .sort({ createdAt: -1, _id: -1 });

    return res.json({
      success: true,
      data: { transactions },
    });
  } catch (error) {
    return next(error);
  }
};
