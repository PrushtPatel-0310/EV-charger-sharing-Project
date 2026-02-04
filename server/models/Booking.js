import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    charger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: [true, 'Charger is required'],
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Slot',
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Renter is required'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    duration: {
      type: Number, // in hours
      required: true,
    },
    timeSlots: [
      {
        start: { type: Date, required: true },
        end: { type: Date, required: true },
      },
    ],
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
      min: [0, 'Price must be positive'],
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'upi', 'card', 'cash', 'other'],
      default: 'wallet',
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    checkInTime: {
      type: Date,
    },
    checkOutTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ charger: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ renter: 1 });
bookingSchema.index({ owner: 1 });
bookingSchema.index({ slot: 1 });
bookingSchema.index({ startTime: 1 });
bookingSchema.index({ endTime: 1 });
bookingSchema.index({ status: 1 });

// Calculate duration before saving
bookingSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    const diff = this.endTime - this.startTime;
    this.duration = parseFloat((diff / (1000 * 60 * 60)).toFixed(2));
  }
  next();
});

// Check for overlapping bookings
bookingSchema.statics.checkAvailability = async function (chargerId, startTime, endTime, excludeBookingId = null) {
  // Fallback for legacy time-range availability checks when slots are not enforced
  const query = {
    charger: chargerId,
    status: { $in: ['pending', 'confirmed', 'active'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlapping = await this.findOne(query);
  return !overlapping;
};

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

