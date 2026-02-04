import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import Slot from '../models/Slot.js';
import Charger from '../models/Charger.js';
import Booking from '../models/Booking.js';
import DisableWindow from '../models/DisableWindow.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';

const ensureChargerOwner = async (chargerId, userId) => {
  const charger = await Charger.findById(chargerId);
  if (!charger) {
    throw new NotFoundError('Charger');
  }

  if (charger.owner.toString() !== userId.toString()) {
    throw new ForbiddenError('Only the charger owner can manage slots');
  }

  return charger;
};

const TIME_PATTERN = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

const normalizeDay = (dateInput) => {
  const date = new Date(dateInput);
  if (isNaN(date)) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const combineDateAndTime = (baseDate, timeString) => {
  if (!TIME_PATTERN.test(timeString)) return null;
  const [hours, minutes] = timeString.split(':').map(Number);
  const combined = new Date(baseDate);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const createSlot = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const { startTime, endTime, pricePerSlot, status = 'available' } = req.body;

    await ensureChargerOwner(chargerId, req.user._id);

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      throw new ValidationError('Start time and end time are required');
    }

    if (end <= start) {
      throw new ValidationError('End time must be after start time');
    }

    if (start < new Date()) {
      throw new ValidationError('Slots cannot start in the past');
    }

    const overlapping = await Slot.findOverlapping(chargerId, start, end);
    if (overlapping) {
      throw new ConflictError('Slot overlaps with an existing slot');
    }

    const slot = await Slot.create({
      charger: chargerId,
      owner: req.user._id,
      startTime: start,
      endTime: end,
      date: normalizeDay(start),
      pricePerSlot,
      status,
    });

    res.status(201).json({
      success: true,
      data: { slot },
      message: 'Slot created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getSlots = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const { from, to, status } = req.query;

    const charger = await Charger.findById(chargerId);
    if (!charger) {
      throw new NotFoundError('Charger');
    }

    const filter = { charger: chargerId };
    const now = new Date();

    const rangeStart = from ? new Date(from) : null;
    const rangeEnd = to ? new Date(to) : null;

    // Default: show any slot that is upcoming or currently ongoing (endTime >= now)
    const lowerBound = !isNaN(rangeStart) ? rangeStart : now;
    if (!isNaN(lowerBound)) {
      filter.$or = [
        { startTime: { $gte: lowerBound } },
        { endTime: { $gte: lowerBound } },
      ];
    }

    // Optional upper bound when provided by caller
    if (!isNaN(rangeEnd)) {
      filter.endTime = { ...(filter.endTime || {}), $lte: rangeEnd };
    }

    const isOwnerRequest = req.user && charger.owner.toString() === req.user._id.toString();
    const resolvedStatus = status || (isOwnerRequest ? 'all' : 'available');
    if (resolvedStatus !== 'all') {
      filter.status = resolvedStatus;
    }

    const slots = await Slot.find(filter).sort({ startTime: 1 });

    res.json({
      success: true,
      data: { slots },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSlot = async (req, res, next) => {
  try {
    const { chargerId, slotId } = req.params;
    const { startTime, endTime, pricePerSlot, status } = req.body;

    await ensureChargerOwner(chargerId, req.user._id);

    const slot = await Slot.findById(slotId);
    if (!slot || slot.charger.toString() !== chargerId) {
      throw new NotFoundError('Slot');
    }

    if (['booked', 'in-use'].includes(slot.status)) {
      throw new ValidationError('Active slots cannot be edited');
    }

    if (startTime) {
      const start = new Date(startTime);
      if (isNaN(start)) {
        throw new ValidationError('Invalid start time');
      }
      slot.startTime = start;
      slot.date = normalizeDay(start);
    }

    if (endTime) {
      const end = new Date(endTime);
      if (isNaN(end)) {
        throw new ValidationError('Invalid end time');
      }
      slot.endTime = end;
    }

    if (slot.endTime <= slot.startTime) {
      throw new ValidationError('End time must be after start time');
    }

    const overlapping = await Slot.findOverlapping(chargerId, slot.startTime, slot.endTime, slotId);
    if (overlapping) {
      throw new ConflictError('Slot overlaps with an existing slot');
    }

    if (pricePerSlot !== undefined) {
      slot.pricePerSlot = pricePerSlot;
    }

    if (status) {
      slot.status = status;
    }

    await slot.save();

    res.json({
      success: true,
      data: { slot },
      message: 'Slot updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSlot = async (req, res, next) => {
  try {
    const { chargerId, slotId } = req.params;

    await ensureChargerOwner(chargerId, req.user._id);

    const slot = await Slot.findById(slotId);
    if (!slot || slot.charger.toString() !== chargerId) {
      throw new NotFoundError('Slot');
    }

    if (['booked', 'in-use'].includes(slot.status)) {
      throw new ValidationError('Active slots cannot be deleted');
    }

    await slot.deleteOne();

    res.json({
      success: true,
      message: 'Slot deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const sanitizeWindows = (windows = [], contextLabel) => {
  return windows.map((window, index) => {
    if (!TIME_PATTERN.test(window.startTime) || !TIME_PATTERN.test(window.endTime)) {
      throw new ValidationError(`${contextLabel} window ${index + 1} has invalid time format`);
    }

    const startRef = combineDateAndTime(new Date(), window.startTime);
    const endRef = combineDateAndTime(new Date(), window.endTime);

    if (!startRef || !endRef || endRef <= startRef) {
      throw new ValidationError(`${contextLabel} window ${index + 1} must end after it starts`);
    }

    return {
      startTime: window.startTime,
      endTime: window.endTime,
      pricePerSlot: window.pricePerSlot,
    };
  });
};

const sanitizeDays = (days = []) => {
  const seen = new Set();

  return days.map((day, index) => {
    const dayOfWeek = Number(day.dayOfWeek);
    if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError(`Day entry ${index + 1} has an invalid dayOfWeek`);
    }

    if (seen.has(dayOfWeek)) {
      throw new ValidationError('Duplicate dayOfWeek values are not allowed in availability template');
    }
    seen.add(dayOfWeek);

    const isAvailable = day.isAvailable !== false;
    const windows = isAvailable ? sanitizeWindows(day.windows || [], `Day ${dayOfWeek}`) : [];

    if (isAvailable && windows.length === 0) {
      throw new ValidationError(`Day ${dayOfWeek} must have at least one window`);
    }

    return {
      dayOfWeek,
      isAvailable,
      windows,
    };
  });
};

const sanitizeSpecialDays = (specialDays = []) =>
  specialDays.map((special, index) => {
    const date = normalizeDay(special.date);
    if (!date) {
      throw new ValidationError(`Special day ${index + 1} has an invalid date`);
    }

    const isAvailable = special.isAvailable !== false;
    const windows = isAvailable ? sanitizeWindows(special.windows || [], `Special day ${date.toISOString().slice(0, 10)}`) : [];

    if (isAvailable && windows.length === 0) {
      throw new ValidationError(`Special day ${date.toISOString().slice(0, 10)} must have at least one window`);
    }

    return {
      date,
      label: special.label,
      isAvailable,
      windows,
    };
  });

const sanitizeTemplatePayload = (payload, currentTemplate = null) => {
  const slotDurationMinutes =
    payload.slotDurationMinutes ?? currentTemplate?.slotDurationMinutes ?? 60;

  if (slotDurationMinutes < 15 || slotDurationMinutes > 720) {
    throw new ValidationError('Slot duration must be between 15 minutes and 12 hours');
  }

  const timezone = payload.timezone || currentTemplate?.timezone || 'UTC';
  const days = payload.days ? sanitizeDays(payload.days) : sanitizeDays(currentTemplate?.days || []);
  const specialDays = payload.specialDays
    ? sanitizeSpecialDays(payload.specialDays)
    : sanitizeSpecialDays(currentTemplate?.specialDays || []);

  if (!days.length) {
    throw new ValidationError('At least one day configuration is required');
  }

  return {
    slotDurationMinutes,
    timezone,
    days,
    specialDays,
  };
};

const resolveDayConfig = (template, dayDate) => {
  const special = (template.specialDays || []).find((entry) =>
    sameDay(new Date(entry.date), dayDate)
  );

  if (special) {
    return {
      ...special,
      dayOfWeek: dayDate.getDay(),
    };
  }

  return (template.days || []).find((day) => day.dayOfWeek === dayDate.getDay()) || null;
};

const SLOT_INTERVAL_MINUTES = 30;
const MAX_SLOTS_PER_BOOKING = 4;
const MAX_ADVANCE_DAYS = 60;
const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'active'];

const toChargerDayBoundsUtc = (dateISO, timezone) => {
  const dayStartLocal = DateTime.fromISO(dateISO, { zone: timezone }).startOf('day');
  const dayEndLocal = dayStartLocal.plus({ days: 1 });
  return {
    dayStartLocal,
    dayEndLocal,
    dayStartUtc: dayStartLocal.toUTC(),
    dayEndUtc: dayEndLocal.toUTC(),
  };
};

const buildSlots = (dayStartUtc, dayEndUtc, blocks) => {
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const slotStart = dayStartUtc.plus({ minutes: SLOT_INTERVAL_MINUTES * i });
    const slotEnd = slotStart.plus({ minutes: SLOT_INTERVAL_MINUTES });
    const blocked = blocks.some((b) => b.start < slotEnd && b.end > slotStart);
    slots.push({
      start: slotStart.toISO(),
      end: slotEnd.toISO(),
      status: blocked ? 'unavailable' : 'available',
    });
  }
  return slots;
};

export const getAvailabilityTemplate = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const charger = await ensureChargerOwner(chargerId, req.user._id);

    res.json({
      success: true,
      data: { template: charger.availabilityTemplate || null },
    });
  } catch (error) {
    next(error);
  }
};

export const upsertAvailabilityTemplate = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const charger = await ensureChargerOwner(chargerId, req.user._id);

    const sanitizedTemplate = sanitizeTemplatePayload(req.body, charger.availabilityTemplate);
    charger.availabilityTemplate = sanitizedTemplate;
    await charger.save();

    res.json({
      success: true,
      data: { template: charger.availabilityTemplate },
      message: 'Availability template saved',
    });
  } catch (error) {
    next(error);
  }
};

export const generateSlotsFromTemplate = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const { startDate, endDate, replaceExisting = false } = req.body;

    const charger = await ensureChargerOwner(chargerId, req.user._id);
    const template = charger.availabilityTemplate;

    if (!template || !template.days || template.days.length === 0) {
      throw new ValidationError('Availability template is not configured for this charger');
    }

    const slotDurationMinutes = template.slotDurationMinutes || 60;
    const start = normalizeDay(startDate || new Date());
    const end = normalizeDay(endDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));

    if (!start || !end) {
      throw new ValidationError('Invalid start or end date');
    }

    if (end < start) {
      throw new ValidationError('End date must be on or after start date');
    }

    const now = new Date();
    const createdSlots = [];
    let skippedOverlap = 0;
    let skippedPast = 0;

    for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
      const dayDate = normalizeDay(cursor);
      const dayConfig = resolveDayConfig(template, dayDate);

      if (!dayConfig || dayConfig.isAvailable === false) {
        continue;
      }

      const windows = dayConfig.windows || [];
      if (!windows.length) {
        continue;
      }

      const dayStart = combineDateAndTime(dayDate, '00:00');
      const dayEnd = combineDateAndTime(dayDate, '23:59');

      let existingSlots = await Slot.find({
        charger: chargerId,
        startTime: { $lt: dayEnd },
        endTime: { $gt: dayStart },
      });

      for (const window of windows) {
        const windowStart = combineDateAndTime(dayDate, window.startTime);
        const windowEnd = combineDateAndTime(dayDate, window.endTime);

        if (!windowStart || !windowEnd || windowEnd <= windowStart) {
          throw new ValidationError(`Invalid window ${window.startTime}-${window.endTime} for day ${dayConfig.dayOfWeek}`);
        }

        let slotStart = new Date(windowStart);

        while (slotStart < windowEnd) {
          const slotEnd = new Date(slotStart.getTime() + slotDurationMinutes * 60 * 1000);
          if (slotEnd > windowEnd) {
            break;
          }

          if (slotEnd <= now) {
            skippedPast += 1;
            slotStart = slotEnd;
            continue;
          }

          const overlaps = existingSlots.filter(
            (slot) => slot.startTime < slotEnd && slot.endTime > slotStart
          );

          let hasOverlap = overlaps.length > 0;

          if (hasOverlap && replaceExisting) {
            const removable = overlaps.filter(
              (slot) => !['booked', 'in-use'].includes(slot.status)
            );

            if (removable.length) {
              const removableIds = removable.map((slot) => slot._id);
              await Slot.deleteMany({ _id: { $in: removableIds } });
              existingSlots = existingSlots.filter((slot) => !removableIds.some((id) => id.equals(slot._id)));
              hasOverlap = existingSlots.some((slot) => slot.startTime < slotEnd && slot.endTime > slotStart);
            }
          }

          if (hasOverlap) {
            skippedOverlap += 1;
            slotStart = slotEnd;
            continue;
          }

          const pricePerSlot =
            window.pricePerSlot !== undefined
              ? window.pricePerSlot
              : (charger.pricePerHour || 0) * (slotDurationMinutes / 60);

          createdSlots.push({
            charger: chargerId,
            owner: charger.owner,
            startTime: slotStart,
            endTime: slotEnd,
            date: normalizeDay(slotStart),
            status: 'available',
            pricePerSlot,
          });

          existingSlots.push({
            startTime: slotStart,
            endTime: slotEnd,
            status: 'available',
          });

          slotStart = slotEnd;
        }
      }
    }

    if (createdSlots.length > 0) {
      await Slot.insertMany(createdSlots);
    }

    res.json({
      success: true,
      data: {
        created: createdSlots.length,
        skippedOverlap,
        skippedPast,
        slotDurationMinutes,
      },
      message: `Generated ${createdSlots.length} slot(s)`,
    });
  } catch (error) {
    next(error);
  }
};

export const getSlotGrid = async (req, res, next) => {
  try {
    const { chargerId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) {
      throw new ValidationError('date query param (YYYY-MM-DD) is required');
    }

    const charger = await Charger.findById(chargerId);
    if (!charger) {
      throw new NotFoundError('Charger');
    }

    const timezone = charger.availabilityTemplate?.timezone || 'UTC';
    const { dayStartLocal, dayEndLocal, dayStartUtc, dayEndUtc } = toChargerDayBoundsUtc(date, timezone);

    const nowLocal = DateTime.now().setZone(timezone);
    if (dayStartLocal < nowLocal.startOf('day')) {
      throw new ValidationError('Cannot fetch past dates');
    }

    if (dayStartLocal > nowLocal.plus({ days: MAX_ADVANCE_DAYS })) {
      throw new ValidationError('Date exceeds booking window');
    }

    const [bookings, disables] = await Promise.all([
      Booking.find({
        charger: chargerId,
        status: { $in: ACTIVE_BOOKING_STATUSES },
        startTime: { $lt: dayEndUtc.toJSDate() },
        endTime: { $gt: dayStartUtc.toJSDate() },
      }).select('startTime endTime'),
      DisableWindow.find({
        charger: chargerId,
        active: true,
        startTime: { $lt: dayEndUtc.toJSDate() },
        endTime: { $gt: dayStartUtc.toJSDate() },
      }).select('startTime endTime'),
    ]);

    const blocks = [...bookings, ...disables].map((i) => ({
      start: DateTime.fromJSDate(i.startTime),
      end: DateTime.fromJSDate(i.endTime),
    }));

    const slots = buildSlots(dayStartUtc, dayEndUtc, blocks);

    res.json({
      success: true,
      data: {
        chargerId,
        date,
        timezone,
        dayStart: dayStartUtc.toISO(),
        dayEnd: dayEndUtc.toISO(),
        slots,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createDisableWindow = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { chargerId } = req.params;
    const { startTime, endTime, reason } = req.body;

    const charger = await Charger.findById(chargerId).session(session);
    if (!charger) {
      throw new NotFoundError('Charger');
    }

    await ensureChargerOwner(chargerId, req.user._id);

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      throw new ValidationError('Valid start and end time are required');
    }

    if (end <= start) {
      throw new ValidationError('End time must be after start time');
    }

    const overlappingDisable = await DisableWindow.findOverlapping(chargerId, start, end).session(session);
    if (overlappingDisable) {
      throw new ConflictError('Disable window overlaps with an existing window');
    }

    const disable = await DisableWindow.create([
      {
        charger: chargerId,
        startTime: start,
        endTime: end,
        reason,
        active: true,
      },
    ], { session });

    // Cancel overlapping bookings
    const overlappingBookings = await Booking.find({
      charger: chargerId,
      status: { $in: ACTIVE_BOOKING_STATUSES },
      startTime: { $lt: end },
      endTime: { $gt: start },
    }).session(session);

    for (const booking of overlappingBookings) {
      booking.status = 'cancelled';
      booking.cancellationReason = reason || 'Charger disabled by host';
      booking.cancelledBy = req.user._id;
      booking.cancelledAt = new Date();
      await booking.save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: { disable: disable[0], cancelledBookings: overlappingBookings.map((b) => b._id) },
      message: 'Disable window created and overlapping bookings cancelled',
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
