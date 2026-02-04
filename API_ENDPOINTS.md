# REST API Endpoints

Base URL: `/api/v1`

## Authentication Routes (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No (refresh token in cookie) |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/me` | Get current user | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |
| PUT | `/auth/password` | Change password | Yes |

## Charger Routes (`/chargers`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/chargers` | Get all chargers (with filters) | No |
| GET | `/chargers/search` | Search chargers by location/radius | No |
| GET | `/chargers/:id` | Get charger by ID | No |
| POST | `/chargers` | Create new charger listing | Yes (owner) |
| PUT | `/chargers/:id` | Update charger listing | Yes (owner) |
| DELETE | `/chargers/:id` | Delete charger listing | Yes (owner) |
| GET | `/chargers/my-chargers` | Get current user's chargers | Yes (owner) |
| GET | `/chargers/:id/availability` | Check availability for date range | No |
| POST | `/chargers/:id/images` | Upload charger images | Yes (owner) |
| DELETE | `/chargers/:id/images/:imageId` | Delete charger image | Yes (owner) |

**Query Parameters for GET `/chargers`:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `minPrice`: Minimum price per hour
- `maxPrice`: Maximum price per hour
- `chargerType`: Filter by type
- `connectorType`: Filter by connector
- `city`: Filter by city
- `state`: Filter by state
- `sortBy`: Sort field (price, rating, distance)
- `sortOrder`: asc/desc

**Query Parameters for GET `/chargers/search`:**
- `lat`: Latitude
- `lng`: Longitude
- `radius`: Radius in km (default: 10)
- `startTime`: ISO date string
- `endTime`: ISO date string
- `chargerType`: Optional filter
- `maxPrice`: Optional filter

## Booking Routes (`/bookings`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/bookings` | Get user's bookings | Yes |
| GET | `/bookings/:id` | Get booking by ID | Yes |
| POST | `/bookings` | Create new booking | Yes (renter) |
| PUT | `/bookings/:id/cancel` | Cancel booking | Yes (renter/owner) |
| PUT | `/bookings/:id/checkin` | Check-in to charger | Yes (renter) |
| PUT | `/bookings/:id/checkout` | Check-out from charger | Yes (renter) |
| GET | `/bookings/upcoming` | Get upcoming bookings | Yes |
| GET | `/bookings/past` | Get past bookings | Yes |
| GET | `/bookings/my-rentals` | Get bookings for owner's chargers | Yes (owner) |

**Request Body for POST `/bookings`:**
```json
{
  "chargerId": "ObjectId",
  "startTime": "ISO date string",
  "endTime": "ISO date string"
}
```

## Review Routes (`/reviews`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reviews/charger/:chargerId` | Get reviews for charger | No |
| GET | `/reviews/user/:userId` | Get reviews for user | No |
| POST | `/reviews` | Create review | Yes (after completed booking) |
| PUT | `/reviews/:id` | Update review | Yes (reviewer only) |
| DELETE | `/reviews/:id` | Delete review | Yes (reviewer only) |

**Request Body for POST `/reviews`:**
```json
{
  "bookingId": "ObjectId",
  "rating": 5,
  "comment": "Great charger!",
  "type": "charger" // or "owner"
}
```

## Payment Routes (`/payments`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments` | Process payment for booking | Yes |
| GET | `/payments/:id` | Get payment details | Yes |
| POST | `/payments/:id/refund` | Request refund | Yes (owner/renter) |
| GET | `/payments/my-payments` | Get user's payment history | Yes |

## AI Routes (`/ai`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/ai/recommendations` | Get AI-powered charger recommendations | Yes |
| POST | `/ai/price-suggestion` | Get AI price optimization suggestions | Yes (owner) |
| POST | `/ai/chat` | AI chatbot for support | Yes |
| GET | `/ai/analytics/:chargerId` | Get AI analytics for charger | Yes (owner) |

**Request Body for POST `/ai/recommendations`:**
```json
{
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  },
  "preferences": {
    "chargerType": "Level 2",
    "maxPrice": 10,
    "amenities": ["WiFi", "Parking"]
  },
  "startTime": "ISO date string",
  "endTime": "ISO date string"
}
```

**Request Body for POST `/ai/price-suggestion`:**
```json
{
  "chargerId": "ObjectId",
  "context": {
    "demand": "high",
    "season": "summer",
    "competitorPrices": [8, 9, 10]
  }
}
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

## Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Validation Error
- `500`: Internal Server Error

## Authentication

- Include access token in `Authorization` header: `Bearer <token>`
- Refresh token sent via httpOnly cookie
- Access token expires in 15 minutes
- Refresh token expires in 7 days

