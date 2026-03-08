import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = { lat: 23.0225, lng: 72.5714 }; // Ahmedabad default

const emojiIcon = (emoji, bg = '#0f172a') =>
  L.divIcon({
    html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${bg};color:#fff;font-size:16px;box-shadow:0 8px 16px rgba(15,23,42,0.2);">${emoji}</div>`,
    className: 'emoji-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });

const chargerIcon = emojiIcon('⚡️', '#66bb6a');
const activeChargerIcon = L.divIcon({
  html: '<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#16a34a;color:#fff;font-size:18px;box-shadow:0 0 0 6px rgba(22,163,74,0.20), 0 10px 20px rgba(22,163,74,0.30);transform:translateY(-2px);">⚡️</div>',
  className: 'emoji-pin-active',
  iconSize: [36, 36],
  iconAnchor: [18, 34],
  popupAnchor: [0, -30],
});
const startIcon = emojiIcon('🚗', '#16a34a');
const endIcon = emojiIcon('📍', '#ef4444');

const Map = ({
  chargers = [],
  center,
  zoom = 5,
  onMarkerClick,
  selectedChargerId,
  routeCoords = [], // array of {lat,lng}
  startLocation,
  endLocation,
  corridorRadiusKm, // optional radius overlay
}) => {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    setActiveId(selectedChargerId || null);
  }, [selectedChargerId]);

  const resolvedCenter = useMemo(() => {
    if (Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      return { lat: Number(center[0]), lng: Number(center[1]) };
    }
    if (startLocation) return startLocation;
    if (chargers.length > 0) {
      const avgLat = chargers.reduce((sum, c) => sum + c.location.coordinates.lat, 0) / chargers.length;
      const avgLng = chargers.reduce((sum, c) => sum + c.location.coordinates.lng, 0) / chargers.length;
      return { lat: avgLat, lng: avgLng };
    }
    return DEFAULT_CENTER;
  }, [center, startLocation, chargers]);

  const positions = useMemo(() => routeCoords.map((p) => [p.lat, p.lng]), [routeCoords]);

  const handleMarkerClick = (id) => {
    setActiveId(id);
    onMarkerClick?.(id);
  };

  const FlyToCenter = ({ point }) => {
    const map = useMap();
    useEffect(() => {
      if (point && map) {
        map.flyTo([point.lat, point.lng], zoom || 12, { duration: 0.8 });
      }
    }, [map, point, zoom]);
    return null;
  };

  return (
    <div className="w-full h-full min-h-96">
      <MapContainer
        center={[resolvedCenter.lat, resolvedCenter.lng]}
        zoom={zoom || 5}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
        scrollWheelZoom
      >
        <FlyToCenter point={resolvedCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {positions.length > 1 && (
          <Polyline positions={positions} color="#4ea65a" weight={5} opacity={0.8} />
        )}

        {startLocation && (
          <Marker position={[startLocation.lat, startLocation.lng]} icon={startIcon}>
            <Popup>Start</Popup>
          </Marker>
        )}

        {endLocation && (
          <Marker position={[endLocation.lat, endLocation.lng]} icon={endIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {positions.length > 0 && corridorRadiusKm && Number(corridorRadiusKm) > 0 && (
          <>
            <Circle
              center={positions[0]}
              radius={Number(corridorRadiusKm) * 1000}
              pathOptions={{ color: '#4ea65a', fillColor: '#4ea65a', fillOpacity: 0.06 }}
            />
            <Circle
              center={positions[positions.length - 1]}
              radius={Number(corridorRadiusKm) * 1000}
              pathOptions={{ color: '#4ea65a', fillColor: '#4ea65a', fillOpacity: 0.06 }}
            />
          </>
        )}

        {chargers.map((charger) => {
          const pos = [charger.location.coordinates.lat, charger.location.coordinates.lng];
          const isSelected = activeId === charger._id || selectedChargerId === charger._id;
          return (
            <Marker
              key={charger._id}
              position={pos}
              eventHandlers={{ click: () => handleMarkerClick(charger._id) }}
              icon={isSelected ? activeChargerIcon : chargerIcon}
            >
              <Popup>
                <div className="text-sm text-primary-900">
                  <h3 className="font-semibold">{charger.title}</h3>
                  <p className="text-primary-700">{charger.location.address}</p>
                  <p className="font-bold text-primary-600">${charger.pricePerHour}/hr</p>
                  <p className="text-xs text-primary-700/80">{charger.chargerType} • {charger.connectorType}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
