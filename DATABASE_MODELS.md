# Database Models (Mongoose Schemas)

## User Model
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed with bcrypt),
  phone: String,
  role: String (enum: ['owner', 'renter', 'both'], default: 'renter'),
  avatar: String (URL),
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  paymentMethods: [{
    type: String,
    last4: String,
    brand: String
  }],
  rating: Number (default: 0),
  totalReviews: Number (default: 0),
  isVerified: Boolean (default: false),
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Charger Model
```javascript
{
  _id: ObjectId,
  owner: ObjectId (ref: 'User', required),
  title: String (required),
  description: String,
  images: [String] (URLs),
  location: {
    address: String (required),
    city: String (required),
    state: String (required),
    zipCode: String (required),
    country: String (required),
    coordinates: {
      lat: Number (required),
      lng: Number (required)
    }
  },
  chargerType: String (enum: ['Level 1', 'Level 2', 'DC Fast'], required),
  connectorType: String (enum: ['Type 1', 'Type 2', 'CCS', 'CHAdeMO', 'Tesla'], required),
  powerOutput: Number (kW, required),
  pricePerHour: Number (required),
  availability: {
    isAvailable: Boolean (default: true),
    schedule: [{
      dayOfWeek: Number (0-6),
      startTime: String (HH:mm),
      endTime: String (HH:mm),
      isAvailable: Boolean
    }]
  },
  amenities: [String] (e.g., ['WiFi', 'Restroom', 'Parking']),
  rating: Number (default: 0),
  totalReviews: Number (default: 0),
  totalBookings: Number (default: 0),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## Booking Model
```javascript
{
  _id: ObjectId,
  charger: ObjectId (ref: 'Charger', required),
  renter: ObjectId (ref: 'User', required),
  owner: ObjectId (ref: 'User', required),
  startTime: Date (required),
  endTime: Date (required),
  duration: Number (hours, calculated),
  totalPrice: Number (required),
  status: String (enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'pending'),
  paymentStatus: String (enum: ['pending', 'paid', 'refunded'], default: 'pending'),
  paymentId: ObjectId (ref: 'Payment'),
  cancellationReason: String,
  cancelledBy: ObjectId (ref: 'User'),
  cancelledAt: Date,
  checkInTime: Date,
  checkOutTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Review Model
```javascript
{
  _id: ObjectId,
  booking: ObjectId (ref: 'Booking', required, unique),
  charger: ObjectId (ref: 'Charger', required),
  reviewer: ObjectId (ref: 'User', required), // renter
  reviewee: ObjectId (ref: 'User', required), // owner
  rating: Number (required, min: 1, max: 5),
  comment: String,
  type: String (enum: ['charger', 'renter', 'owner']),
  createdAt: Date,
  updatedAt: Date
}
```

## Payment Model
```javascript
{
  _id: ObjectId,
  booking: ObjectId (ref: 'Booking', required),
  payer: ObjectId (ref: 'User', required), // renter
  recipient: ObjectId (ref: 'User', required), // owner
  amount: Number (required),
  currency: String (default: 'USD'),
  status: String (enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending'),
  paymentMethod: String,
  transactionId: String,
  refundAmount: Number,
  refundReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

### User Collection
- `email`: unique index
- `address.coordinates`: 2dsphere index (for geospatial queries)

### Charger Collection
- `owner`: index
- `location.coordinates`: 2dsphere index (for geospatial queries)
- `chargerType`: index
- `isActive`: index
- `availability.isAvailable`: index

### Booking Collection
- `charger`: index
- `renter`: index
- `owner`: index
- `startTime`: index
- `endTime`: index
- `status`: index
- Compound index: `{ charger: 1, startTime: 1, endTime: 1 }` (for availability checks)

### Review Collection
- `booking`: unique index
- `charger`: index
- `reviewer`: index
- `reviewee`: index

### Payment Collection
- `booking`: index
- `payer`: index
- `status`: index

