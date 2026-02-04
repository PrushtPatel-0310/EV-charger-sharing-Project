import mongoose from 'mongoose';

const disableWindowSchema = new mongoose.Schema(
  {
    charger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
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
    reason: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

disableWindowSchema.index({ charger: 1, startTime: 1, endTime: 1 });
disableWindowSchema.index({ charger: 1, active: 1 });

disableWindowSchema.statics.findOverlapping = async function (chargerId, startTime, endTime) {
  return this.findOne({
    charger: chargerId,
    active: true,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
};

const DisableWindow = mongoose.model('DisableWindow', disableWindowSchema);

export default DisableWindow;
