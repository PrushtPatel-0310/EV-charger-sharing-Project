# Location & Map Features - Quick Reference Card

## 🎯 What Was Added

| Component | Location | Purpose |
|-----------|----------|---------|
| `Map.jsx` | `client/src/components/` | Display chargers on map |
| `LocationPicker.jsx` | `client/src/components/` | Select location interactively |
| Enhanced CreateCharger | `client/src/pages/` | Map-based charger creation |
| Enhanced ChargerList | `client/src/pages/` | Grid + Map view, location search |
| Enhanced ChargerDetail | `client/src/pages/` | Location map display |

## 🚀 How to Use

### For Charger Owners (Creating a Charger)
```
1. Navigate to "List Your Charger"
2. Fill in basic charger information
3. Scroll to Location section
4. Click on the map to place a marker
   OR search for an address
   OR click "Use My Location"
   OR enter latitude/longitude manually
5. See address auto-fill (when from search)
6. Submit the form
```

### For Charger Renters (Finding Chargers)
```
1. Navigate to Chargers page
2. Click "🗺️ Map" to view map mode
3. Click "🔍 Search" to open search
4. Enter latitude & longitude
5. Set search radius (e.g., 10km)
6. Optional: Filter by type or max price
7. Click "Search" to find nearby chargers
8. View results on interactive map
9. Click markers or cards to interact
```

### View Charger Details
```
1. Click any charger card or marker
2. Navigate to charger detail page
3. See map showing exact location
4. View all charger information
5. Make a booking if desired
```

## 🔧 Component Usage

### Map Component
```jsx
import Map from '../components/Map.jsx';

<Map
  chargers={chargers}           // Array of charger objects
  center={[40.7128, -74.0060]} // [lat, lng]
  zoom={13}                     // Map zoom level
  onMarkerClick={handleClick}   // Callback when marker clicked
  selectedChargerId={id}        // Currently selected charger
  searchRadius={10}             // Radius in km (shows circle)
/>
```

### LocationPicker Component
```jsx
import LocationPicker from '../components/LocationPicker.jsx';

<LocationPicker
  initialLat={40.7128}                    // Starting latitude
  initialLng={-74.0060}                   // Starting longitude
  onLocationSelected={(coords) => {       // Required callback
    // coords = {lat: number, lng: number}
  }}
  onAddressChange={(address) => {}}       // Optional callback
/>
```

## 📱 Features

### Map Component Features
- ✅ Interactive Leaflet map
- ✅ Marker placement for chargers
- ✅ Color-coded markers (red/green)
- ✅ Click handlers for interaction
- ✅ Popup information cards
- ✅ Search radius circle overlay
- ✅ Responsive sizing

### LocationPicker Features
- ✅ Click on map to place marker
- ✅ Search addresses (Nominatim API)
- ✅ Address autocomplete suggestions
- ✅ Use device GPS location
- ✅ Manual coordinate input
- ✅ Real-time validation
- ✅ Visual feedback

### ChargerList Search Features
- ✅ Latitude/Longitude input
- ✅ Radius slider (0.5-100 km)
- ✅ Charger type filter
- ✅ Max price filter
- ✅ "Use My Location" button
- ✅ Switch grid/map view
- ✅ Marker/card synchronization

## 🌍 External APIs

| API | Purpose | Free? | API Key? |
|-----|---------|-------|----------|
| OpenStreetMap | Map tiles | ✅ Yes | ✅ No |
| Nominatim | Address search | ✅ Yes | ✅ No |
| Geolocation | Device location | ✅ Yes | ✅ No |

## 📊 State Management

### CreateCharger State
```javascript
formData.location = {
  address: "123 Main St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  coordinates: {
    lat: 40.7128,
    lng: -74.0060
  }
}
```

### ChargerList State
```javascript
searchParams = {
  latitude: "40.7128",
  longitude: "-74.0060",
  radius: 10,
  chargerType: "Level 2",
  maxPrice: "20"
}

viewMode = "grid" // or "map"
selectedChargerId = "charger_id_here"
```

## 🔌 API Endpoints

```
GET /chargers                              // List all chargers
GET /chargers/:id                          // Get charger details
POST /chargers                             // Create charger
PUT /chargers/:id                          // Update charger
DELETE /chargers/:id                       // Delete charger

GET /chargers/search                       // Search by location
  ?lat=40.7128                            // Latitude (required)
  &lng=-74.0060                           // Longitude (required)
  &radius=10                              // Radius in km (default: 10)
  &chargerType=Level%202                  // Optional filter
  &maxPrice=20                            // Optional filter
```

## 🎨 UI Elements

### View Mode Buttons
```jsx
<button onClick={() => setViewMode('grid')}>📋 Grid</button>
<button onClick={() => setViewMode('map')}>🗺️ Map</button>
```

### Search Button
```jsx
<button onClick={() => setShowSearchForm(!showSearchForm)}>
  🔍 Search
</button>
```

### Location Button
```jsx
<button onClick={handleGetUserLocation}>
  📍 Use My Location
</button>
```

## 💾 Database Structure

```javascript
// Charger collection - location field
{
  _id: ObjectId,
  title: String,
  location: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    coordinates: {
      lat: Number,    // -90 to 90
      lng: Number     // -180 to 180
    }
  },
  // ... other fields
}

// Index
db.chargers.createIndex({ "location.coordinates": "2dsphere" })
```

## ⚡ Performance Tips

1. **Search Optimization**: Use reasonable radius (5-20 km)
2. **Map Performance**: Limit markers on screen (50 max)
3. **Address Search**: Be specific with search terms
4. **Mobile**: Uses touch-friendly controls

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Map not loading | Check internet, refresh page |
| Geolocation error | Allow permission in browser |
| Address search no results | Try more specific address |
| Coordinates showing 0,0 | Click map to place marker |
| Search returns nothing | Increase search radius |
| Map slow | Zoom in for better performance |

## 📚 Documentation

- **LOCATION_MAP_FEATURES.md** - Complete feature guide
- **LOCATION_QUICK_START.md** - User guide with tips
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **ARCHITECTURE.md** - System architecture (updated)

## 🚀 Getting Started

1. Navigate to the project
2. Install dependencies: `npm install leaflet react-leaflet --legacy-peer-deps`
3. Start dev server: `npm run dev`
4. Try creating a charger with map location
5. Try searching chargers by location

## ✅ Checklist for Testing

- [ ] Can click map to place marker
- [ ] Can search address and get suggestions
- [ ] Can use "Use My Location" button
- [ ] Can create charger with map location
- [ ] Can view charger location on detail page
- [ ] Can search chargers by location
- [ ] Can toggle between grid and map view
- [ ] Can filter search by type and price
- [ ] Everything works on mobile

## 🎓 Learning Resources

- Leaflet: https://leafletjs.com/
- React-Leaflet: https://react-leaflet.js.org/
- Nominatim: https://nominatim.org/
- Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

## 💡 Tips & Tricks

1. **Mobile Testing**: Use browser DevTools to simulate mobile
2. **Geolocation**: Works only on HTTPS (except localhost)
3. **Address Search**: Full addresses work best
4. **Markers**: Colors change based on selection
5. **Zoom**: Map auto-adjusts based on search results

## 🎉 You're All Set!

Your EV Charger app now has production-ready location and mapping features!
