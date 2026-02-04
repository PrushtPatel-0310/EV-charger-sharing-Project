import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6, // 0 = Sunday, 6 = Saturday
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'],
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
});

const availabilityWindowSchema = new mongoose.Schema({
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'],
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:mm)'],
  },
  pricePerSlot: {
    type: Number,
    min: [0, 'Price per slot must be positive'],
  },
});

const availabilityDaySchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  windows: {
    type: [availabilityWindowSchema],
    validate: {
      validator: function (windows) {
        if (!this.isAvailable) return true;
        return Array.isArray(windows) && windows.length > 0;
      },
      message: 'At least one window is required when a day is available',
    },
  },
});

const specialDaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  label: {
    type: String,
    trim: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  windows: {
    type: [availabilityWindowSchema],
    validate: {
      validator: function (windows) {
        if (!this.isAvailable) return true;
        return Array.isArray(windows) && windows.length > 0;
      },
      message: 'At least one window is required when the day is available',
    },
  },
});

const availabilityTemplateSchema = new mongoose.Schema({
  slotDurationMinutes: {
    type: Number,
    min: [15, 'Slot duration must be at least 15 minutes'],
    max: [720, 'Slot duration cannot exceed 12 hours'],
    default: 60,
  },
  timezone: {
    type: String,
    default: 'UTC',
  },
  days: [availabilityDaySchema],
  specialDays: [specialDaySchema],
});

const chargerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      address: {
        type: String,
        required: [true, 'Address is required'],
      },
      city: {
        type: String,
        required: [true, 'City is required'],
      },
      state: {
        type: String,
        required: [true, 'State is required'],
      },
      zipCode: {
        type: String,
        required: [true, 'Zip code is required'],
      },
      country: {
        type: String,
        required: [true, 'Country is required'],
        default: 'India',
      },
      coordinates: {
        lat: {
          type: Number,
          required: [true, 'Latitude is required'],
          min: -90,
          max: 90,
        },
        lng: {
          type: Number,
          required: [true, 'Longitude is required'],
          min: -180,
          max: 180,
        },
      },
    },
    chargerType: {
      type: String,
      enum: ['Level 1', 'Level 2', 'DC Fast'],
      required: [true, 'Charger type is required'],
    },
    connectorType: {
      type: String,
      enum: ['Type 1', 'Type 2', 'CCS', 'CHAdeMO', 'Tesla'],
      required: [true, 'Connector type is required'],
    },
    powerOutput: {
      type: Number,
      required: [true, 'Power output is required'],
      min: [0, 'Power output must be positive'],
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Price per hour is required'],
      min: [0, 'Price must be positive'],
    },
    availability: {
      isAvailable: {
        type: Boolean,
        default: true,
      },
      schedule: [scheduleSchema],
    },
    availabilityTemplate: availabilityTemplateSchema,
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    disabledPermanently: {
      type: Boolean,
      default: false,
    },
    disabledReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
chargerSchema.index({ owner: 1 });
chargerSchema.index({ 'location.coordinates': '2dsphere' });
chargerSchema.index({ chargerType: 1 });
chargerSchema.index({ isActive: 1 });
chargerSchema.index({ 'availability.isAvailable': 1 });
chargerSchema.index({ pricePerHour: 1 });
chargerSchema.index({ rating: -1 });

// Update rating when review is added/updated
chargerSchema.methods.updateRating = async function () {
  const Review = mongoose.model('Review');
  const reviews = await Review.find({ charger: this._id });
  
  if (reviews.length === 0) {
    this.rating = 0;
    this.totalReviews = 0;
  } else {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = parseFloat((totalRating / reviews.length).toFixed(1));
    this.totalReviews = reviews.length;
  }
  
  await this.save();
};

const Charger = mongoose.model('Charger', chargerSchema);

export default Charger;

