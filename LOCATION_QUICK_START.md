# Location & Map Features - Quick Start Guide

## What's New

### 1. **Create/List Chargers with Map Selection**
- When creating a charger, use the interactive **Location Picker** to set coordinates
- Search for addresses, use your location, or manually enter coordinates
- The map shows your selected location in real-time

### 2. **Browse Chargers on a Map**
- Go to the Chargers page and click **🗺️ Map** button
- Switch between **Grid** and **Map** views
- Use the **🔍 Search** button to find chargers by location:
  - Enter latitude/longitude
  - Set search radius (0.5-100 km)
  - Filter by charger type and max price
  - Click "Use My Location" for quick access

### 3. **View Charger Location Details**
- On any charger detail page, see a map showing its exact location
- Zoom level 15 provides detailed street-level view

## Component Files Created

1. **Map.jsx** - Displays chargers on interactive map
2. **LocationPicker.jsx** - Pick location with address search

## Features at a Glance

| Feature | Location | Access |
|---------|----------|--------|
| Interactive Map | Charger List, Detail, Create | Click map buttons |
| Address Search | Location Picker | Type address in search |
| Current Location | Location Picker, Search | Click "Use My Location" |
| Coordinate Input | Location Picker, Search | Manual entry |
| Search Radius | Charger List Search | Km selector (0.5-100) |
| Filter Search | Charger List Search | Type/Price filters |
| Marker Interaction | All Maps | Click markers |
| Map Toggle | Charger List | Grid/Map buttons |

## Key Technical Points

- **Free & Open Source**: Uses OpenStreetMap (Nominatim, Leaflet)
- **No API Keys Required**: Works out of the box
- **Mobile Friendly**: Responsive on all devices
- **Fast**: Geospatial indexing on server (MongoDB 2dsphere)
- **Secure**: No tracking, user location only sent when requested

## API Reference

### Location Search (Charger List)
```
GET /chargers/search?lat=40.7128&lng=-74.0060&radius=10&chargerType=Level%202&maxPrice=15
```

### Charger Coordinates in Database
```javascript
charger.location.coordinates = {
  lat: 40.7128,
  lng: -74.0060
}
```

## Browser Requirements

✅ Chrome 60+
✅ Firefox 55+
✅ Safari 11+
✅ Edge 79+

**Note**: Geolocation requires HTTPS (except localhost)

## Tips for Best Results

1. **Searching**: Start with a larger radius and narrow down
2. **Address Search**: Use full address for better autocomplete
3. **Listing Charger**: Click on map to place marker precisely
4. **Mobile**: Allow location permission when prompted
5. **Map Selection**: Zoom in/out to find exact location

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Map not loading | Check internet connection, refresh page |
| "Use My Location" not working | Check browser location permissions |
| Address search returning wrong results | Try more specific address |
| Coordinates showing as 0,0 | Click on map to set position |
| Search returning no results | Increase search radius |

## Future Enhancements

- Route planning to chargers
- Real-time availability heatmap
- Distance calculation display
- Saved favorite locations
- Integration with navigation apps
