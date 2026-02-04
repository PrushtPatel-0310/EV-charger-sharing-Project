# EV Charger Sharing Platform - System Architecture

## High-Level Overview

A peer-to-peer EV charger sharing platform where charger owners can list their charging stations and EV drivers can discover, book, and use available chargers.

## System Components

### Frontend (React + Vite)
- **Client Application**: Single Page Application (SPA) using React Router
- **State Management**: React Context API / Custom hooks
- **Styling**: Tailwind CSS for responsive, modern UI
- **API Communication**: Axios/Fetch for REST API calls
- **Authentication**: JWT token management (access + refresh)
- **Maps & Location**: Leaflet + react-leaflet for interactive maps

### Backend (Node.js + Express)
- **REST API Server**: Express.js with middleware architecture
- **Authentication Middleware**: JWT verification, refresh token rotation
- **Business Logic Layer**: Controllers handling request/response
- **Data Access Layer**: Mongoose ODM for MongoDB operations
- **AI Integration**: External API calls for AI features (OpenAI, etc.)
- **Geospatial Queries**: MongoDB 2dsphere indexing for location-based search

### Database (MongoDB)
- **Document Store**: NoSQL database for flexible schema
- **Collections**: Users, Chargers, Bookings, Reviews, Payments
- **Indexing**: Optimized queries for location, availability, dates
- **Geospatial Index**: 2dsphere index on charger coordinates for fast location search

### External Services
- **AI APIs**: OpenAI/Anthropic for recommendations, chatbot, analytics
- **Payment Gateway**: (Structure ready, integration optional)
- **Maps/Geolocation**: 
  - OpenStreetMap (free tile layer via Leaflet)
  - Nominatim (free address geocoding/search)
  - Browser Geolocation API (device location access)

## Location & Map Architecture

### Components Created

**Map.jsx** - Interactive Map Display
- Displays chargers as color-coded markers
- Click handlers for marker interaction
- Search radius visualization circles
- Popup information cards for each charger
- Responsive full-height container
- OpenStreetMap tile layer

**LocationPicker.jsx** - Location Selection Tool
- Interactive click-to-place marker on map
- Address search via Nominatim geocoding API
- "Use My Location" button (Geolocation API)
- Manual latitude/longitude input
- Address autocomplete suggestions
- Real-time coordinate validation

### Integrated Pages

- **CreateCharger.jsx**: Location selection during charger creation
- **ChargerList.jsx**: Dual view (grid + map), location-based search
- **ChargerDetail.jsx**: Map showing charger's exact location

### Geospatial Data Structure

```javascript
location: {
  address: String,      // "123 Main St"
  city: String,         // "New York"
  state: String,        // "NY"
  zipCode: String,      // "10001"
  country: String,      // "USA"
  coordinates: {
    lat: Number,        // -90 to 90 (latitude)
    lng: Number         // -180 to 180 (longitude)
  }
}
```

### Location Search Flow

```
User Search
    ↓
Enter lat/lng + radius
    ↓
GET /chargers/search?lat=X&lng=Y&radius=Z
    ↓
MongoDB 2dsphere geospatial query
    ↓
Returns chargers sorted by distance
    ↓
Display on interactive map
```

## Data Flow

1. **User Registration/Login** → JWT tokens generated → Stored in httpOnly cookies
2. **Charger Discovery** → Location-based search → AI-powered recommendations
3. **Booking Flow** → Availability check → Reservation creation → Payment processing
4. **AI Features** → User data + context → External AI API → Personalized results
5. **Location Search** → User coordinates + radius → Geospatial query → Nearby chargers

## Security Architecture

- **JWT Access Tokens**: Short-lived (15min), stored in memory
- **JWT Refresh Tokens**: Long-lived (7 days), httpOnly cookies
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Express-validator middleware + custom validation
- **CORS**: Configured for frontend origin
- **Rate Limiting**: API request throttling
- **Location Privacy**: User location only collected on explicit request, not persistent

## Scalability Considerations

- **Database Indexing**: Location (2dsphere), dates, user IDs
- **API Pagination**: Large result sets
- **Caching Strategy**: Redis-ready structure (optional)
- **File Uploads**: Cloud storage ready (AWS S3, Cloudinary)
- **Error Handling**: Centralized error middleware
- **Logging**: Structured logging for production debugging
- **Geospatial Performance**: 2dsphere index optimizes distance queries
- **Marker Clustering**: Can be added for very large datasets




