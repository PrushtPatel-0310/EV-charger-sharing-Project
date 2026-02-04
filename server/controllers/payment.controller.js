import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export const processPayment = async (req, res, next) => {
  try {
    const { bookingId, paymentMethod, transactionId } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('charger')
      .populate('renter')
      .populate('owner');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.renter._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only pay for your own bookings');
    }

    if (booking.paymentStatus === 'paid') {
      throw new ValidationError('Booking is already paid');
    }

    // Create payment record
    const payment = await Payment.create({
      booking: bookingId,
      payer: req.user._id,
      recipient: booking.owner._id,
      amount: booking.totalPrice,
      currency: 'USD',
      status: 'completed', // In production, this would be set after payment gateway confirmation
      paymentMethod,
      transactionId: transactionId || `TXN-${Date.now()}`,
    });

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.paymentId = payment._id;
    booking.status = 'confirmed';
    await booking.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate('payer', 'name email')
      .populate('recipient', 'name email')
      .populate('booking');

    res.status(201).json({
      success: true,
      data: { payment: populatedPayment },
      message: 'Payment processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking')
      .populate('payer', 'name email')
      .populate('recipient', 'name email');

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Check if user is payer or recipient
    if (
      payment.payer._id.toString() !== req.user._id.toString() &&
      payment.recipient._id.toString() !== req.user._id.toString()
    ) {
      throw new ForbiddenError('You can only view your own payments');
    }

    res.json({
      success: true,
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

export const requestRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id)
      .populate('booking');

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Check permissions
    if (
      payment.payer._id.toString() !== req.user._id.toString() &&
      payment.recipient._id.toString() !== req.user._id.toString()
    ) {
      throw new ForbiddenError('You can only request refunds for your own payments');
    }

    if (payment.status !== 'completed') {
      throw new ValidationError('Can only refund completed payments');
    }

    payment.status = 'refunded';
    payment.refundAmount = payment.amount;
    payment.refundReason = reason || 'Refund requested';

    // Update booking payment status
    if (payment.booking) {
      payment.booking.paymentStatus = 'refunded';
      await payment.booking.save();
    }

    await payment.save();

    res.json({
      success: true,
      data: { payment },
      message: 'Refund processed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      $or: [
        { payer: req.user._id },
        { recipient: req.user._id },
      ],
    })
      .populate('booking', 'startTime endTime totalPrice')
      .populate('payer', 'name email')
      .populate('recipient', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { payments },
    });
  } catch (error) {
    next(error);
  }
};

