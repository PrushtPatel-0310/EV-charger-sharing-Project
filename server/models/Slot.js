import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema(
  {
    charger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    // Normalized calendar date derived from startTime to simplify day-wise queries
    date: {
      type: Date,
      required: true,
      default: function () {
        const base = this.startTime ? new Date(this.startTime) : new Date();
        base.setHours(0, 0, 0, 0);
        return base;
      },
    },
    status: {
      type: String,
      enum: ['available', 'booked', 'in-use', 'completed', 'cancelled', 'blocked'],
      default: 'available',
    },
    pricePerSlot: {
      type: Number,
      min: [0, 'Price must be positive'],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
  },
  {
    timestamps: true,
  }
);

slotSchema.index({ charger: 1, startTime: 1, endTime: 1 });
slotSchema.index({ owner: 1 });
slotSchema.index({ status: 1 });
slotSchema.index({ charger: 1, date: 1 });

slotSchema.statics.findOverlapping = async function (chargerId, startTime, endTime, excludeSlotId = null) {
  const query = {
    charger: chargerId,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  if (excludeSlotId) {
    query._id = { $ne: excludeSlotId };
  }

  return this.findOne(query);
};

// Backfill normalized date before validation so updates stay consistent
slotSchema.pre('validate', function (next) {
  if (this.startTime) {
    const normalized = new Date(this.startTime);
    normalized.setHours(0, 0, 0, 0);
    this.date = normalized;
  }
  next();
});

const Slot = mongoose.model('Slot', slotSchema);

export default Slot;
