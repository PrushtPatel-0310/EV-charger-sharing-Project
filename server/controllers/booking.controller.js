import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import Booking from '../models/Booking.js';
import Charger from '../models/Charger.js';
import DisableWindow from '../models/DisableWindow.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError, BadRequestError } from '../utils/errors.js';
import { upgradeChatToBooked } from '../services/chat.service.js';
import { sendNotificationEmail, EMAIL_TYPES } from '../utils/emailService.js';

const SLOT_INTERVAL_MINUTES = 30;
const MAX_SLOTS_PER_BOOKING = 4; // 4 x 30 minutes = 2 hours
const MAX_ADVANCE_DAYS = 60; // ~2 months
const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'active'];
const AUTO_COMPLETE_STATUSES = ['confirmed', 'active'];

const getChargerTimezone = (charger) => charger.availabilityTemplate?.timezone || 'UTC';

const markExpiredBookingsCompleted = async (filters = {}) => {
  await Booking.updateMany(
    {
      ...filters,
      status: { $in: AUTO_COMPLETE_STATUSES },
      endTime: { $lte: new Date() },
    },
    {
      $set: { status: 'completed' },
    }
  );
};

const isAlignedToInterval = (dateTime) =>
  dateTime.minute % SLOT_INTERVAL_MINUTES === 0 && dateTime.second === 0 && dateTime.millisecond === 0;

const isSameBookingDay = (startLocal, endLocal) => {
  // Allow end at exact midnight next day but same calendar day for occupied minutes
  const endEffective = endLocal.minus({ milliseconds: 1 });
  return startLocal.startOf('day').equals(endEffective.startOf('day'));
};

export const createBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { chargerId, startTime, endTime, slots: incomingSlots = [] } = req.body;

    const charger = await Charger.findById(chargerId).session(session);
    if (!charger) throw new NotFoundError('Charger');
    if (charger.owner.toString() === req.user._id.toString()) {
      throw new ValidationError('You cannot book your own charger');
    }

    const renter = await User.findById(req.user._id).session(session);
    if (!renter) throw new NotFoundError('User');

    const owner = await User.findById(charger.owner).session(session);
    if (!owner) throw new NotFoundError('Owner');

    const timezone = getChargerTimezone(charger);

    const parseFromSlots = () => {
      if (!Array.isArray(incomingSlots) || incomingSlots.length === 0) return null;

      const parsed = incomingSlots.map((slot) => ({
        start: DateTime.fromISO(slot.start, { zone: 'utc' }).setZone(timezone),
        end: DateTime.fromISO(slot.end, { zone: 'utc' }).setZone(timezone),
      }));

      if (parsed.some((p) => !p.start.isValid || !p.end.isValid)) {
        throw new ValidationError('All slots must be valid ISO datetimes');
      }

      const sorted = parsed.sort((a, b) => a.start.toMillis() - b.start.toMillis());
      for (let i = 0; i < sorted.length; i++) {
        const { start: s, end: e } = sorted[i];
        if (e <= s) throw new ValidationError('Each slot end must be after start');
        if (!isAlignedToInterval(s) || !isAlignedToInterval(e)) {
          throw new ValidationError('Slots must align to 30-minute boundaries');
        }
        const slotMinutes = e.diff(s, 'minutes').minutes;
        if (slotMinutes !== SLOT_INTERVAL_MINUTES) {
          throw new ValidationError('Each slot must be exactly 30 minutes');
        }
        if (i > 0) {
          const prev = sorted[i - 1];
          if (!s.equals(prev.end)) {
            throw new ValidationError('Slots must be contiguous 30-minute blocks');
          }
        }
      }

      const startLocal = sorted[0].start;
      const endLocal = sorted[sorted.length - 1].end;

      if (!isSameBookingDay(startLocal, endLocal)) {
        throw new ValidationError('Booking must stay within the selected day');
      }

      const slotCount = sorted.length;
      return { startLocal, endLocal, slotCount, sorted };
    };

    const parsedFromSlots = parseFromSlots();
    const startLocal = parsedFromSlots
      ? parsedFromSlots.startLocal
      : DateTime.fromISO(startTime, { zone: 'utc' }).setZone(timezone);
    const endLocal = parsedFromSlots
      ? parsedFromSlots.endLocal
      : DateTime.fromISO(endTime, { zone: 'utc' }).setZone(timezone);

    if (!startLocal.isValid || !endLocal.isValid) {
      throw new ValidationError('Valid start and end time are required');
    }
    if (endLocal <= startLocal) throw new ValidationError('End time must be after start time');
    if (!isSameBookingDay(startLocal, endLocal)) {
      throw new ValidationError('Booking must stay within the selected day');
    }
    if (!isAlignedToInterval(startLocal) || !isAlignedToInterval(endLocal)) {
      throw new ValidationError('Bookings must align to 30-minute boundaries');
    }

    const durationMinutes = endLocal.diff(startLocal, 'minutes').minutes;
    const slotCount = parsedFromSlots ? parsedFromSlots.slotCount : durationMinutes / SLOT_INTERVAL_MINUTES;
    if (!Number.isInteger(slotCount)) {
      throw new ValidationError('Selected range must align to 30-minute slots');
    }
    if (slotCount < 1 || slotCount > MAX_SLOTS_PER_BOOKING) {
      throw new ValidationError('Bookings must be between 30 minutes and 2 hours');
    }

    const nowLocal = DateTime.now().setZone(timezone);
    if (startLocal < nowLocal) throw new ValidationError('Cannot book time in the past');
    if (startLocal > nowLocal.plus({ days: MAX_ADVANCE_DAYS })) {
      throw new ValidationError('Bookings are allowed only up to 2 months in advance');
    }

    const startUtc = startLocal.toUTC().toJSDate();
    const endUtc = endLocal.toUTC().toJSDate();

    const disabled = await DisableWindow.findOne({
      charger: chargerId,
      active: true,
      startTime: { $lt: endUtc },
      endTime: { $gt: startUtc },
    }).session(session);
    if (disabled) throw new ConflictError('Charger is disabled for the selected time');

    const overlappingBooking = await Booking.findOne({
      charger: chargerId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startTime: { $lt: endUtc },
      endTime: { $gt: startUtc },
    }).session(session);
    if (overlappingBooking) throw new ConflictError('This time range is already booked');

    const pricePerSlot = charger.pricePerHour * (SLOT_INTERVAL_MINUTES / 60);
    const totalPrice = Number((slotCount * pricePerSlot).toFixed(2));

    const walletBalance = Number(renter.walletBalance ?? 0);
    if (Number.isNaN(walletBalance) || walletBalance < totalPrice) {
      throw new ValidationError('Insufficient wallet balance');
    }

    renter.walletBalance = Number((walletBalance - totalPrice).toFixed(2));
    await renter.save({ session });

    const ownerWallet = Number(owner.walletBalance ?? 0);
    owner.walletBalance = Number((ownerWallet + totalPrice).toFixed(2));
    await owner.save({ session });

    const timeSlots = parsedFromSlots
      ? parsedFromSlots.sorted.map(({ start, end }) => ({ start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() }))
      : Array.from({ length: slotCount }).map((_, i) => {
          const slotStart = new Date(startUtc.getTime() + i * SLOT_INTERVAL_MINUTES * 60 * 1000);
          const slotEnd = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000);
          return { start: slotStart, end: slotEnd };
        });

    const [booking] = await Booking.create([
      {
        charger: chargerId,
        renter: req.user._id,
        owner: charger.owner,
        startTime: startUtc,
        endTime: endUtc,
        duration: durationMinutes / 60,
        timeSlots,
        totalPrice,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: 'wallet',
        currency: 'INR',
      },
    ], { session });

    const transactionDescription = `Booking ${booking._id.toString()} wallet payment`;
    const transactionDate = new Date();

    await Transaction.insertMany([
      {
        user: renter._id,
        amount: totalPrice,
        type: 'DEBIT',
        category: 'Booking',
        status: 'Success',
        description: transactionDescription,
        createdAt: transactionDate,
      },
      {
        user: owner._id,
        amount: totalPrice,
        type: 'CREDIT',
        category: 'Booking',
        status: 'Success',
        description: transactionDescription,
        createdAt: transactionDate,
      },
    ], { session, ordered: true });

    const [payment] = await Payment.create([
      {
        booking: booking._id,
        payer: renter._id,
        recipient: charger.owner,
        amount: totalPrice,
        currency: 'INR',
        status: 'completed',
        paymentMethod: 'wallet',
        transactionId: `WALLET-${Date.now()}`,
      },
    ], { session });

    booking.paymentId = payment._id;
    await booking.save({ session });

    charger.totalBookings += 1;
    await charger.save({ session });

    await session.commitTransaction();

    try {
      await upgradeChatToBooked({
        renterId: req.user._id,
        ownerId: charger.owner,
        chargerId,
        bookingId: booking._id,
      });
    } catch (chatError) {
      console.error('Chat upgrade error:', chatError.message);
    }

    // Fire-and-forget booking confirmation emails
    Promise.all([
      sendNotificationEmail(renter.email, EMAIL_TYPES.BOOKING_CONFIRMED_RENTER, {
        bookingId: booking._id,
        chargerTitle: charger.title,
        location: charger.location,
        startTime: startUtc,
        endTime: endUtc,
        price: totalPrice,
        renterName: renter.name,
        hostName: owner.name,
      }),
      sendNotificationEmail(owner.email, EMAIL_TYPES.BOOKING_CONFIRMED_HOST, {
        bookingId: booking._id,
        chargerTitle: charger.title,
        location: charger.location,
        startTime: startUtc,
        endTime: endUtc,
        price: totalPrice,
        renterName: renter.name,
        hostName: owner.name,
      }),
    ]).catch((emailErr) => console.error('Booking confirmation email error:', emailErr.message));

    const populatedBooking = await Booking.findById(booking._id)
      .populate('charger', 'title location pricePerHour availabilityTemplate')
      .populate('slot')
      .populate('owner', 'name email');

    res.status(201).json({
      success: true,
      data: { booking: populatedBooking, walletBalance: renter.walletBalance, pricePerSlot },
      message: 'Booking confirmed and paid from wallet',
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const { status, type = 'all' } = req.query;
    await markExpiredBookingsCompleted({
      $or: [{ renter: req.user._id }, { owner: req.user._id }],
    });

    const query = {};

    if (type === 'upcoming') {
      query.renter = req.user._id;
      query.startTime = { $gte: new Date() };
      query.status = { $ne: 'cancelled' };
    } else if (type === 'past') {
      query.renter = req.user._id;
      query.endTime = { $lt: new Date() };
    } else if (type === 'bookings') {
      query.renter = req.user._id;
    } else if (type === 'rentals') {
      query.owner = req.user._id;
    } else {
      query.$or = [
        { renter: req.user._id },
        { owner: req.user._id },
      ];
    }

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .populate('charger', 'title location images pricePerHour availabilityTemplate.timezone')
      .populate('renter', 'name email avatar')
      .populate('owner', 'name email avatar')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('charger')
      .populate('renter', 'name email avatar phone')
      .populate('owner', 'name email avatar phone');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Check if user is renter or owner
    if (
      booking.renter._id.toString() !== req.user._id.toString() &&
      booking.owner._id.toString() !== req.user._id.toString()
    ) {
      throw new ForbiddenError('You can only view your own bookings');
    }

    if (AUTO_COMPLETE_STATUSES.includes(booking.status) && new Date(booking.endTime) <= new Date()) {
      booking.status = 'completed';
      await booking.save();
    }

    res.json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .session(session)
      .populate('charger')
      .populate('renter')
      .populate('owner');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (
      booking.renter._id.toString() !== req.user._id.toString() &&
      booking.owner._id.toString() !== req.user._id.toString()
    ) {
      throw new ForbiddenError('You can only cancel your own bookings');
    }

    if (new Date() > new Date(booking.endTime)) {
      throw new BadRequestError('Cannot cancel booking after slot end time');
    }

    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new ValidationError(`Cannot cancel a ${booking.status} booking`);
    }

    const payment = booking.paymentId
      ? await Payment.findById(booking.paymentId).session(session)
      : null;

    const refundAmount = payment?.amount ?? booking.totalPrice;

    booking.status = 'cancelled';
    booking.cancelledBy = req.user._id;
    booking.cancelledAt = new Date();
    booking.paymentStatus = booking.paymentStatus === 'paid' ? 'refunded' : booking.paymentStatus;
    if (reason) booking.cancellationReason = reason;

    if (payment) {
      payment.status = 'refunded';
      payment.refundAmount = refundAmount;
      payment.refundReason = reason || 'Booking cancelled';
      await payment.save({ session });
    }

    let renterWalletBalance;
    let ownerWalletBalance;

    if (booking.paymentMethod === 'wallet' && refundAmount > 0 && booking.paymentStatus === 'refunded') {
      const renter = await User.findById(booking.renter._id).session(session);
      const owner = await User.findById(booking.owner._id).session(session);

      if (!renter || !owner) {
        throw new NotFoundError('User');
      }

      const ownerBalance = Number(owner.walletBalance ?? 0);
      if (ownerBalance < refundAmount) {
        throw new ValidationError('Host has insufficient balance to refund this booking');
      }

      owner.walletBalance = Number((ownerBalance - refundAmount).toFixed(2));
      renter.walletBalance = Number(((renter.walletBalance ?? 0) + refundAmount).toFixed(2));
      ownerWalletBalance = owner.walletBalance;
      renterWalletBalance = renter.walletBalance;

      await owner.save({ session });
      await renter.save({ session });

      const refundDescription = `Refund for booking ${booking._id.toString()} cancellation`;
      const refundDate = new Date();

      await Transaction.insertMany(
        [
          {
            user: owner._id,
            amount: refundAmount,
            type: 'DEBIT',
            category: 'Refund',
            status: 'Success',
            description: refundDescription,
            createdAt: refundDate,
          },
          {
            user: renter._id,
            amount: refundAmount,
            type: 'CREDIT',
            category: 'Refund',
            status: 'Success',
            description: refundDescription,
            createdAt: refundDate,
          },
        ],
        { session, ordered: true }
      );
    }

    await booking.save({ session });

    await session.commitTransaction();

    const cancelledByRenter = booking.renter._id.toString() === req.user._id.toString();
    const cancelledByOwner = booking.owner._id.toString() === req.user._id.toString();

    Promise.all([
      cancelledByRenter
        ? sendNotificationEmail(booking.renter.email, EMAIL_TYPES.BOOKING_CANCELLED_BY_RENTER_RENTER, {
            bookingId: booking._id,
            chargerTitle: booking.charger.title,
            location: booking.charger.location,
            startTime: booking.startTime,
            endTime: booking.endTime,
            price: booking.totalPrice,
            renterName: booking.renter.name,
            hostName: booking.owner.name,
            status: booking.paymentStatus,
          })
        : null,
      cancelledByRenter
        ? sendNotificationEmail(booking.owner.email, EMAIL_TYPES.BOOKING_CANCELLED_BY_RENTER_HOST, {
            bookingId: booking._id,
            chargerTitle: booking.charger.title,
            location: booking.charger.location,
            startTime: booking.startTime,
            endTime: booking.endTime,
            price: booking.totalPrice,
            renterName: booking.renter.name,
            hostName: booking.owner.name,
            status: booking.paymentStatus,
          })
        : null,
      cancelledByOwner
        ? sendNotificationEmail(booking.renter.email, EMAIL_TYPES.BOOKING_CANCELLED_BY_HOST_RENTER, {
            bookingId: booking._id,
            chargerTitle: booking.charger.title,
            location: booking.charger.location,
            startTime: booking.startTime,
            endTime: booking.endTime,
            price: booking.totalPrice,
            renterName: booking.renter.name,
            hostName: booking.owner.name,
            refundAmount,
            status: booking.paymentStatus,
          })
        : null,
    ]).catch((emailErr) => console.error('Cancellation email error:', emailErr.message));

    res.json({
      success: true,
      data: { booking, renterWalletBalance, ownerWalletBalance },
      message: 'Booking cancelled successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

export const checkIn = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.renter.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only the renter can check in');
    }

    if (AUTO_COMPLETE_STATUSES.includes(booking.status) && new Date(booking.endTime) <= new Date()) {
      booking.status = 'completed';
      await booking.save();
      throw new ValidationError('Booking slot has ended and is marked as completed');
    }

    if (booking.status !== 'confirmed') {
      throw new ValidationError('Booking must be confirmed to check in');
    }

    const now = Date.now();
    const startsAt = new Date(booking.startTime).getTime();
    const endsAt = new Date(booking.endTime).getTime();

    if (now < startsAt || now > endsAt) {
      throw new ValidationError('Check-in is only allowed during the booked slot time');
    }

    booking.status = 'active';
    booking.checkInTime = new Date();
    await booking.save();

    res.json({
      success: true,
      data: { booking },
      message: 'Checked in successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const checkOut = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.renter.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only the renter can check out');
    }

    if (booking.status !== 'active') {
      throw new ValidationError('Booking must be active to check out');
    }

    const now = Date.now();
    const startsAt = new Date(booking.startTime).getTime();
    const endsAt = new Date(booking.endTime).getTime();

    if (now < startsAt) {
      throw new ValidationError('Check-out is only allowed during the booked slot time');
    }

    if (now > endsAt) {
      // If the slot has already ended, mark checkout automatically
      booking.status = 'completed';
      booking.checkOutTime = new Date(booking.endTime);
      await booking.save();

      return res.json({
        success: true,
        data: { booking },
        message: 'Booking auto-checked out after end time',
      });
    }

    booking.status = 'completed';
    booking.checkOutTime = new Date();
    await booking.save();

    res.json({
      success: true,
      data: { booking },
      message: 'Checked out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getUpcomingBookings = async (req, res, next) => {
  try {
    await markExpiredBookingsCompleted({
      $or: [{ renter: req.user._id }, { owner: req.user._id }],
    });

    const bookings = await Booking.find({
      renter: req.user._id,
      startTime: { $gte: new Date() },
      status: { $ne: 'cancelled' },
    })
      .populate('charger', 'title location images availabilityTemplate.timezone')
      .populate('owner', 'name email')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

export const getPastBookings = async (req, res, next) => {
  try {
    await markExpiredBookingsCompleted({
      $or: [{ renter: req.user._id }, { owner: req.user._id }],
    });

    const bookings = await Booking.find({
      renter: req.user._id,
      endTime: { $lt: new Date() },
    })
      .populate('charger', 'title location images availabilityTemplate.timezone')
      .populate('owner', 'name email')
      .sort({ endTime: -1 });

    res.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRentals = async (req, res, next) => {
  try {
    await markExpiredBookingsCompleted({
      $or: [{ renter: req.user._id }, { owner: req.user._id }],
    });

    const bookings = await Booking.find({
      owner: req.user._id,
    })
      .populate('charger', 'title location images availabilityTemplate.timezone')
      .populate('renter', 'name email avatar')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

