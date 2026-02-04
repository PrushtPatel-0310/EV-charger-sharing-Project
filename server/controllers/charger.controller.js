import Charger from '../models/Charger.js';
import Booking from '../models/Booking.js';
import DisableWindow from '../models/DisableWindow.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { getIO } from '../socket.js';

export const getAllChargers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      minPrice,
      maxPrice,
      chargerType,
      connectorType,
      city,
      state,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query = { isActive: true };
    if (req.user?._id) {
      query.owner = { $ne: req.user._id }; // hide own chargers from public feed
    }

    // Apply filters
    if (minPrice) query.pricePerHour = { ...query.pricePerHour, $gte: parseFloat(minPrice) };
    if (maxPrice) query.pricePerHour = { ...query.pricePerHour, $lte: parseFloat(maxPrice) };
    if (chargerType) query.chargerType = chargerType;
    if (connectorType) query.connectorType = connectorType;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (state) query['location.state'] = new RegExp(state, 'i');

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chargers = await Charger.find(query)
      .populate('owner', 'name email avatar rating')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Charger.countDocuments(query);

    res.json({
      success: true,
      data: {
        chargers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const searchChargers = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10, startTime, endTime, chargerType, maxPrice } = req.query;

    if (!lat || !lng) {
      throw new ValidationError('Latitude and longitude are required');
    }

    const baseQuery = {
      isActive: true,
      'availability.isAvailable': true,
    };

    const radiusKm = Number.isFinite(parseFloat(radius)) ? Math.max(0.1, parseFloat(radius)) : 10;

    if (req.user?._id) {
      baseQuery.owner = { $ne: req.user._id };
    }
    if (chargerType) baseQuery.chargerType = chargerType;
    if (maxPrice) baseQuery.pricePerHour = { $lte: parseFloat(maxPrice) };

    const haversineKm = (lat1, lon1, lat2, lon2) => {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const allChargers = await Charger.find(baseQuery)
      .populate('owner', 'name email avatar rating')
      .limit(400);

    let chargers = allChargers
      .map((charger) => {
        const cLat = charger.location?.coordinates?.lat;
        const cLng = charger.location?.coordinates?.lng;
        if (typeof cLat !== 'number' || typeof cLng !== 'number') return null;
        const distanceKm = haversineKm(parseFloat(lat), parseFloat(lng), cLat, cLng);
        return { charger, distanceKm };
      })
      .filter(Boolean)
      .filter(({ distanceKm }) => distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map(({ charger }) => charger)
      .slice(0, 200);

    // Filter by availability if time range provided
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      const availableChargers = [];
      for (const charger of chargers) {
        const isAvailable = await Booking.checkAvailability(
          charger._id,
          start,
          end
        );
        if (isAvailable) {
          availableChargers.push(charger);
        }
      }
      chargers = availableChargers;
    }

    res.json({
      success: true,
      data: { chargers, count: chargers.length },
    });
  } catch (error) {
    next(error);
  }
};

export const getChargerById = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id)
      .populate('owner', 'name email avatar rating totalReviews');

    if (!charger) {
      throw new NotFoundError('Charger');
    }

    res.json({
      success: true,
      data: { charger },
    });
  } catch (error) {
    next(error);
  }
};

export const createCharger = async (req, res, next) => {
  try {
    const chargerData = {
      ...req.body,
      owner: req.user._id,
    };

    const charger = await Charger.create(chargerData);

    // Update user role if needed
    if (req.user.role === 'renter') {
      req.user.role = 'both';
      await req.user.save();
    }

    res.status(201).json({
      success: true,
      data: { charger },
      message: 'Charger created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updateCharger = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger');
    }

    if (charger.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only update your own chargers');
    }

    Object.assign(charger, req.body);
    await charger.save();

    res.json({
      success: true,
      data: { charger },
      message: 'Charger updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCharger = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger');
    }

    if (charger.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only delete your own chargers');
    }

    await Charger.deleteOne({ _id: charger._id });

    res.json({
      success: true,
      message: 'Charger deleted permanently',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyChargers = async (req, res, next) => {
  try {
    const chargers = await Charger.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { chargers },
    });
  } catch (error) {
    next(error);
  }
};

export const checkAvailability = async (req, res, next) => {
  try {
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      throw new ValidationError('Start time and end time are required');
    }

    const charger = await Charger.findById(req.params.id);
    if (!charger) {
      throw new NotFoundError('Charger');
    }

    const timezone = charger.availabilityTemplate?.timezone || 'UTC';
    const startLocal = DateTime.fromISO(startTime, { zone: 'utc' }).setZone(timezone);
    const endLocal = DateTime.fromISO(endTime, { zone: 'utc' }).setZone(timezone);

    if (!startLocal.isValid || !endLocal.isValid) {
      throw new ValidationError('Invalid start or end time');
    }

    const startUtc = startLocal.toUTC().toJSDate();
    const endUtc = endLocal.toUTC().toJSDate();

    const disabled = await DisableWindow.findOne({
      charger: charger._id,
      active: true,
      startTime: { $lt: endUtc },
      endTime: { $gt: startUtc },
    });

    if (disabled) {
      return res.json({
        success: true,
        data: {
          isAvailable: false,
          charger: { _id: charger._id, title: charger.title },
        },
      });
    }

    const overlapping = await Booking.findOne({
      charger: charger._id,
      status: { $in: ['pending', 'confirmed', 'active'] },
      startTime: { $lt: endUtc },
      endTime: { $gt: startUtc },
    });

    res.json({
      success: true,
      data: {
        isAvailable: !overlapping,
        charger: {
          _id: charger._id,
          title: charger.title,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

const createCancellationMessage = async ({ booking, refundAmount, reason, session }) => {
  // Ensure a chat exists between owner and renter for this charger and booking
  let chat = await Chat.findOne({
    renterId: booking.renter._id || booking.renter,
    ownerId: booking.owner._id || booking.owner,
    chargerId: booking.charger,
  }).session(session);

  if (!chat) {
    chat = await Chat.create([
      {
        renterId: booking.renter._id || booking.renter,
        ownerId: booking.owner._id || booking.owner,
        chargerId: booking.charger,
        bookingId: booking._id,
        chatType: 'BOOKED',
        lastMessage: {},
        unreadForRenter: 0,
        unreadForOwner: 0,
      },
    ], { session }).then((docs) => docs[0]);
  } else if (chat.chatType !== 'BOOKED' || !chat.bookingId) {
    chat.chatType = 'BOOKED';
    chat.bookingId = booking._id;
  }

  const messageText = `Your booking for charger ${booking.charger} from ${booking.startTime.toISOString()} to ${booking.endTime.toISOString()} was cancelled because: ${reason || 'Charger disabled by owner'}. Refund of ₹${Number(refundAmount || 0).toFixed(2)} has been issued to your wallet.`;

  const messageDoc = await Message.create([
    {
      chatId: chat._id,
      senderId: booking.owner._id || booking.owner,
      senderRole: 'OWNER',
      messageText,
      isRead: false,
    },
  ], { session }).then((docs) => docs[0]);

  // Update chat unread counters and last message from owner
  chat.unreadForRenter = (chat.unreadForRenter || 0) + 1;
  chat.unreadForOwner = 0;
  chat.lastMessage = {
    text: messageDoc.messageText,
    senderId: booking.owner._id || booking.owner,
    senderRole: 'OWNER',
    at: messageDoc.createdAt,
    isReadByOwner: true,
    isReadByRenter: false,
  };
  await chat.save({ session });

  return { chatId: chat._id.toString(), message: messageDoc };
};

const cancelBookingsForWindow = async ({ chargerId, windowStart, windowEnd, reason, session }) => {
  const bookings = await Booking.find({
    charger: chargerId,
    status: { $in: ['pending', 'confirmed', 'active'] },
    startTime: { $lt: windowEnd },
    endTime: { $gt: windowStart },
  })
    .session(session)
    .populate('renter')
    .populate('owner');

  if (!bookings.length) return { cancelledCount: 0, refunded: 0, notifications: [] };

  let refunded = 0;
  const notifications = [];
  for (const booking of bookings) {
    const payment = booking.paymentId
      ? await Payment.findById(booking.paymentId).session(session)
      : null;

    const refundAmount = payment?.amount ?? booking.totalPrice ?? 0;

    // Adjust wallets (allow owner balance to go negative to guarantee renter refund)
    const owner = booking.owner || (await User.findById(booking.owner).session(session));
    const renter = booking.renter || (await User.findById(booking.renter).session(session));

    owner.walletBalance = Number(((owner.walletBalance ?? 0) - refundAmount).toFixed(2));
    renter.walletBalance = Number(((renter.walletBalance ?? 0) + refundAmount).toFixed(2));

    await owner.save({ session });
    await renter.save({ session });

    if (payment) {
      payment.status = 'refunded';
      payment.refundAmount = refundAmount;
      payment.refundReason = reason || 'Booking cancelled by owner';
      await payment.save({ session });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = owner._id;
    booking.paymentStatus = 'refunded';
    booking.cancellationReason = reason || 'Cancelled due to charger being disabled';
    await booking.save({ session });

    refunded += refundAmount;

    // Queue chat notification to renter about the cancellation
    const notification = await createCancellationMessage({
      booking,
      refundAmount,
      reason,
      session,
    });
    if (notification) notifications.push(notification);
  }

  return { cancelledCount: bookings.length, refunded, notifications };
};

export const disableCharger = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { mode, startDate, endDate, reason, startTime, endTime } = req.body;
    const charger = await Charger.findById(req.params.id).session(session);

    if (!charger) throw new NotFoundError('Charger');
    if (charger.owner.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only manage your own chargers');
    }

    if (!['temporary', 'permanent', 'today'].includes(mode)) {
      throw new ValidationError('Mode must be temporary, today, or permanent');
    }

    let windowStart;
    let windowEnd;

    if (mode === 'temporary') {
      if (!startDate || !endDate) {
        throw new ValidationError('Start and end date are required for temporary disable');
      }
      windowStart = new Date(startDate);
      windowEnd = new Date(endDate);
      if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) {
        throw new ValidationError('Invalid start or end date');
      }
      if (windowEnd <= windowStart) {
        throw new ValidationError('End date must be after start date');
      }
    } else if (mode === 'today') {
      const today = DateTime.now();
      if (!startTime || !endTime) {
        throw new ValidationError('Start and end time are required for disabling today');
      }
      if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(startTime) || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(endTime)) {
        throw new ValidationError('Time must be in HH:mm format');
      }

      const startParts = startTime.split(':').map(Number);
      const endParts = endTime.split(':').map(Number);
      windowStart = today.set({ hour: startParts[0], minute: startParts[1], second: 0, millisecond: 0 }).toJSDate();
      windowEnd = today.set({ hour: endParts[0], minute: endParts[1], second: 0, millisecond: 0 }).toJSDate();

      if (windowEnd <= windowStart) {
        throw new ValidationError('End time must be after start time');
      }
    } else {
      windowStart = new Date();
      // Far future end to block permanently
      windowEnd = DateTime.now().plus({ years: 100 }).toJSDate();
    }

    // Create disable window
    await DisableWindow.create([
      {
        charger: charger._id,
        startTime: windowStart,
        endTime: windowEnd,
        reason: reason || (mode === 'permanent' ? 'Disabled permanently' : mode === 'today' ? 'Disabled for today' : 'Disabled temporarily'),
        active: true,
      },
    ], { session });

    // Update charger flags
    charger.disabledReason = reason || charger.disabledReason;
    if (mode === 'permanent') {
      charger.isActive = false;
      charger.disabledPermanently = true;
      charger.availability = { ...charger.availability, isAvailable: false };
    }
    await charger.save({ session });

    // Cancel overlapping bookings
    const { cancelledCount, refunded, notifications } = await cancelBookingsForWindow({
      chargerId: charger._id,
      windowStart,
      windowEnd,
      reason: reason || (mode === 'permanent'
        ? 'Charger permanently disabled'
        : mode === 'today'
          ? 'Charger disabled for today'
          : 'Charger temporarily disabled'),
      session,
    });

    await session.commitTransaction();

    // Emit chat updates for cancelled bookings after transaction commits
    const io = getIO();
    if (io && notifications?.length) {
      notifications.forEach(({ chatId, message }) => {
        io.to(`chat:${chatId}`).emit('message:new', { message });
        io.to(`chat:${chatId}`).emit('chat:updated', { chatId });
      });
    }

    res.json({
      success: true,
      data: {
        charger,
        cancelledBookings: cancelledCount,
        totalRefunded: refunded,
        mode,
        window: { startTime: windowStart, endTime: windowEnd },
      },
      message:
        mode === 'permanent'
          ? 'Charger disabled permanently'
          : mode === 'today'
            ? 'Charger disabled for today'
            : 'Charger disabled temporarily',
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

