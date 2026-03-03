import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Charger from '../models/Charger.js';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../utils/errors.js';

export const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findById(bookingId).populate('charger');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.renter.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Only the renter can create a review');
    }

    if (booking.status !== 'completed') {
      throw new ValidationError('Can only review completed bookings');
    }

    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      throw new ConflictError('Review already exists for this booking');
    }

    const review = await Review.create({
      booking: bookingId,
      charger: booking.charger._id,
      user: req.user._id,
      rating,
      comment,
    });

    const populatedReview = await Review.findById(review._id).populate('user', 'name avatar');

    const charger = await Charger.findById(booking.charger._id);
    if (charger) {
      await charger.updateRating();
    }

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
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const reviews = await Review.find({ charger: req.params.chargerId })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit);

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
    const reviews = await Review.find({ user: req.params.userId })
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

    if (review.user.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only update your own reviews');
    }

    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('user', 'name avatar')
      .populate('charger', 'title');

    const charger = await Charger.findById(review.charger);
    if (charger) {
      await charger.updateRating();
    }

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

    if (review.user.toString() !== req.user._id.toString()) {
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

