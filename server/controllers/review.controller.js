import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';

export const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment, type } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('charger')
      .populate('renter')
      .populate('owner');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Check if user is the renter
    if (booking.renter._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only the renter can create a review');
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      throw new ValidationError('Can only review completed bookings');
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      throw new ConflictError('Review already exists for this booking');
    }

    const reviewData = {
      booking: bookingId,
      charger: booking.charger._id,
      reviewer: req.user._id,
      rating,
      comment,
      type: type || 'charger',
    };

    // Set reviewee based on type
    if (type === 'owner') {
      reviewData.reviewee = booking.owner._id;
    } else {
      reviewData.reviewee = booking.owner._id; // Default to owner for charger reviews
    }

    const review = await Review.create(reviewData);

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar')
      .populate('charger', 'title');

    res.status(201).json({
      success: true,
      data: { review: populatedReview },
      message: 'Review created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getChargerReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ charger: req.params.chargerId })
      .populate('reviewer', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate('reviewer', 'name avatar')
      .populate('charger', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new NotFoundError('Review');
    }

    if (review.reviewer.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('reviewer', 'name avatar')
      .populate('reviewee', 'name avatar')
      .populate('charger', 'title');

    res.json({
      success: true,
      data: { review: populatedReview },
      message: 'Review updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      throw new NotFoundError('Review');
    }

    if (review.reviewer.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only delete your own reviews');
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

