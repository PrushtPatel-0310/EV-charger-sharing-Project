# Project Folder Structure

## Root Directory
```
EVcharger/
├── client/                 # Frontend React application
├── server/                 # Backend Node.js application
├── ARCHITECTURE.md         # System architecture documentation
├── FOLDER_STRUCTURE.md     # This file
├── DATABASE_MODELS.md      # Mongoose schemas
├── API_ENDPOINTS.md        # REST API documentation
└── README.md               # Project overview and setup
```

## Frontend Structure (`client/`)
```
client/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Buttons, Inputs, Cards, etc.
│   │   ├── layout/         # Header, Footer, Sidebar, etc.
│   │   └── features/       # Feature-specific components
│   │       ├── charger/    # Charger listing, details, etc.
│   │       ├── booking/    # Booking forms, calendar, etc.
│   │       └── ai/         # AI recommendation components
│   ├── pages/              # Route-level page components
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ChargerList.jsx
│   │   ├── ChargerDetail.jsx
│   │   ├── Booking.jsx
│   │   ├── MyBookings.jsx
│   │   ├── MyChargers.jsx
│   │   └── Profile.jsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useCharger.js
│   │   ├── useBooking.js
│   │   └── useAI.js
│   ├── context/            # React Context providers
│   │   ├── AuthContext.jsx
│   │   └── ChargerContext.jsx
│   ├── services/           # API service functions
│   │   ├── api.js          # Axios instance & interceptors
│   │   ├── authService.js
│   │   ├── chargerService.js
│   │   ├── bookingService.js
│   │   └── aiService.js
│   ├── utils/              # Utility functions
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── styles/             # Global styles
│   │   └── index.css
│   ├── App.jsx             # Main app component with routes
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind imports
├── .env                    # Environment variables
├── .gitignore
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Backend Structure (`server/`)
```
server/
├── config/                 # Configuration files
│   ├── database.js         # MongoDB connection
│   ├── jwt.js              # JWT configuration
│   └── ai.js               # AI API configuration
├── models/                 # Mongoose models
│   ├── User.js
│   ├── Charger.js
│   ├── Booking.js
│   ├── Review.js
│   └── Payment.js
├── routes/                 # Express route definitions
│   ├── auth.routes.js
│   ├── charger.routes.js
│   ├── booking.routes.js
│   ├── review.routes.js
│   ├── payment.routes.js
│   └── ai.routes.js
├── controllers/            # Route handlers (business logic)
│   ├── auth.controller.js
│   ├── charger.controller.js
│   ├── booking.controller.js
│   ├── review.controller.js
│   ├── payment.controller.js
│   └── ai.controller.js
├── middleware/             # Custom middleware
│   ├── auth.middleware.js  # JWT verification
│   ├── validate.middleware.js  # Input validation
│   ├── error.middleware.js # Error handling
│   └── upload.middleware.js # File upload (multer)
├── services/               # Business logic services
│   ├── auth.service.js
│   ├── charger.service.js
│   ├── booking.service.js
│   └── ai.service.js       # AI API integration
├── utils/                  # Utility functions
│   ├── logger.js
│   ├── errors.js           # Custom error classes
│   └── helpers.js
├── .env                    # Environment variables
├── .gitignore
├── package.json
└── server.js               # Entry point
```

