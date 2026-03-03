import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    charger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: [true, 'Charger is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ booking: 1 }, { unique: true, sparse: true });
reviewSchema.index({ charger: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

// Recalculate charger rating whenever a review changes
const refreshChargerRating = async (chargerId) => {
  if (!chargerId) return;
  const Charger = mongoose.model('Charger');
  const charger = await Charger.findById(chargerId);
  if (charger) {
    await charger.updateRating();
  }
};

reviewSchema.post('save', async function () {
  await refreshChargerRating(this.charger);
});

reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await refreshChargerRating(doc.charger);
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;

