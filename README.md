# EV Charger Sharing Platform

A full-stack MERN application for peer-to-peer EV charger sharing, where charger owners can list their charging stations and EV drivers can discover, book, and use available chargers.

## Features

- **User Authentication**: JWT-based authentication with access and refresh tokens
- **Charger Management**: List, search, and manage EV chargers
- **Booking System**: Book chargers with availability checking
- **Reviews & Ratings**: Rate chargers and owners
- **Payment Processing**: Payment structure ready for integration
- **AI Features**:
  - Personalized charger recommendations
  - Price optimization suggestions
  - Analytics dashboard
  - Support chatbot

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose
- JWT Authentication
- Express Validator
- Helmet, CORS, Rate Limiting

### Frontend
- React 18 (Vite)
- React Router v6
- Tailwind CSS
- Axios

## Project Structure

```
EVcharger/
├── server/          # Backend application
│   ├── config/      # Configuration files
│   ├── controllers/ # Route controllers
│   ├── middleware/  # Custom middleware
│   ├── models/      # Mongoose models
│   ├── routes/      # Express routes
│   ├── services/    # Business logic services
│   └── utils/       # Utility functions
├── client/          # Frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React context providers
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/evcharger
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OPENAI_API_KEY=your-openai-api-key
FRONTEND_URL=http://localhost:5173
```

4. Start the server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (optional):
```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/profile` - Update profile
- `PUT /api/v1/auth/password` - Change password

### Chargers
- `GET /api/v1/chargers` - Get all chargers (with filters)
- `GET /api/v1/chargers/search` - Search chargers by location
- `GET /api/v1/chargers/:id` - Get charger by ID
- `POST /api/v1/chargers` - Create charger (owner only)
- `PUT /api/v1/chargers/:id` - Update charger (owner only)
- `DELETE /api/v1/chargers/:id` - Delete charger (owner only)
- `GET /api/v1/chargers/my-chargers` - Get user's chargers
- `GET /api/v1/chargers/:id/availability` - Check availability

### Bookings
- `GET /api/v1/bookings` - Get user's bookings
- `GET /api/v1/bookings/:id` - Get booking by ID
- `POST /api/v1/bookings` - Create booking
- `PUT /api/v1/bookings/:id/cancel` - Cancel booking
- `PUT /api/v1/bookings/:id/checkin` - Check in
- `PUT /api/v1/bookings/:id/checkout` - Check out

### Reviews
- `GET /api/v1/reviews/charger/:chargerId` - Get charger reviews
- `GET /api/v1/reviews/user/:userId` - Get user reviews
- `POST /api/v1/reviews` - Create review
- `PUT /api/v1/reviews/:id` - Update review
- `DELETE /api/v1/reviews/:id` - Delete review

### Payments
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/:id` - Get payment details
- `POST /api/v1/payments/:id/refund` - Request refund
- `GET /api/v1/payments/my-payments` - Get payment history

### AI
- `POST /api/v1/ai/recommendations` - Get AI recommendations
- `POST /api/v1/ai/price-suggestion` - Get price suggestions
- `POST /api/v1/ai/chat` - AI chatbot
- `GET /api/v1/ai/analytics/:chargerId` - Get analytics

## Database Models

- **User**: User accounts with roles (owner, renter, both)
- **Charger**: Charger listings with location, pricing, availability
- **Booking**: Booking records with status tracking
- **Review**: Reviews and ratings for chargers and users
- **Payment**: Payment records and transactions

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Input validation with express-validator
- CORS configuration
- Rate limiting
- Helmet for security headers

## Development

- Backend uses ES6 modules
- Frontend uses Vite for fast development
- Hot reload enabled for both frontend and backend

## Production Deployment

1. Set `NODE_ENV=production`
2. Update MongoDB connection string
3. Set secure JWT secret
4. Configure CORS for production domain
5. Build frontend: `cd client && npm run build`
6. Serve frontend build or deploy separately

## License

ISC

