import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking is required'],
    },
    charger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Charger',
      required: [true, 'Charger is required'],
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer is required'],
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewee is required'],
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
    type: {
      type: String,
      enum: ['charger', 'renter', 'owner'],
      required: [true, 'Review type is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ charger: 1 });
reviewSchema.index({ reviewer: 1 });
reviewSchema.index({ reviewee: 1 });

// Update charger and user ratings after review is saved
reviewSchema.post('save', async function () {
  if (this.type === 'charger') {
    const Charger = mongoose.model('Charger');
    const charger = await Charger.findById(this.charger);
    if (charger) {
      await charger.updateRating();
    }
  }

  const User = mongoose.model('User');
  const user = await User.findById(this.reviewee);
  if (user) {
    await user.updateRating();
  }
});

// Update ratings after review is deleted
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    if (doc.type === 'charger') {
      const Charger = mongoose.model('Charger');
      const charger = await Charger.findById(doc.charger);
      if (charger) {
        await charger.updateRating();
      }
    }

    const User = mongoose.model('User');
    const user = await User.findById(doc.reviewee);
    if (user) {
      await user.updateRating();
    }
  }
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;

