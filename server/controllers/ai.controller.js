import { AIService } from '../services/ai.service.js';
import Charger from '../models/Charger.js';
import Booking from '../models/Booking.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const getRecommendations = async (req, res, next) => {
  try {
    const { location, preferences, startTime, endTime } = req.body;

    if (!location || !location.lat || !location.lng) {
      throw new ValidationError('Location with lat and lng is required');
    }

    // Get user's booking history for personalization
    const userHistory = await Booking.find({ renter: req.user._id })
      .populate('charger')
      .limit(10)
      .sort({ createdAt: -1 });

    // Get AI recommendations
    const aiResponse = await AIService.getRecommendations(
      location,
      preferences || {},
      startTime,
      endTime,
      userHistory
    );

    // Fetch charger details for recommended IDs
    const chargerIds = aiResponse.recommendations.map((rec) => rec.chargerId);
    const chargers = await Charger.find({
      _id: { $in: chargerIds },
      isActive: true,
    })
      .populate('owner', 'name email avatar rating');

    // Map recommendations with charger data
    const recommendations = aiResponse.recommendations.map((rec) => {
      const charger = chargers.find((c) => c._id.toString() === rec.chargerId);
      return {
        ...rec,
        charger,
      };
    }).filter((rec) => rec.charger); // Remove if charger not found

    res.json({
      success: true,
      data: {
        recommendations,
        insights: aiResponse.insights,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPriceSuggestion = async (req, res, next) => {
  try {
    const { chargerId, context } = req.body;

    const charger = await Charger.findById(chargerId);
    if (!charger) {
      throw new NotFoundError('Charger');
    }

    // Get competitor prices (chargers in same area)
    if (!context.competitorPrices) {
      const competitors = await Charger.find({
        'location.city': charger.location.city,
        _id: { $ne: chargerId },
        isActive: true,
      }).select('pricePerHour');

      context.competitorPrices = competitors.map((c) => c.pricePerHour);
    }

    const suggestion = await AIService.getPriceSuggestion(chargerId, context);

    res.json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    next(error);
  }
};

export const chat = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      throw new ValidationError('Message is required');
    }

    // Get user context
    const userBookings = await Booking.find({ renter: req.user._id })
      .limit(5)
      .sort({ createdAt: -1 });

    const context = {
      userId: req.user._id,
      recentBookings: userBookings.length,
    };

    const response = await AIService.chat(message, context);

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnalytics = async (req, res, next) => {
  try {
    const { timeRange = '30d' } = req.query;
    const { chargerId } = req.params;

    const charger = await Charger.findById(chargerId);
    if (!charger) {
      throw new NotFoundError('Charger');
    }

    // Verify ownership
    if (charger.owner.toString() !== req.user._id.toString()) {
      throw new ValidationError('You can only view analytics for your own chargers');
    }

    // Calculate date range
    const days = parseInt(timeRange.replace('d', '')) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get booking data for analytics
    const bookings = await Booking.find({
      charger: chargerId,
      createdAt: { $gte: startDate },
    });

    const analytics = await AIService.getAnalytics(chargerId, timeRange);

    // Add real booking data
    analytics.actualData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      completedBookings: bookings.filter((b) => b.status === 'completed').length,
      averageDuration: bookings.length > 0
        ? (bookings.reduce((sum, b) => sum + (b.duration || 0), 0) / bookings.length).toFixed(2)
        : 0,
    };

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

