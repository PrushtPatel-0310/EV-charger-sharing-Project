import { useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import Map from '../components/Map.jsx';
import { chargerService } from '../services/chargerService.js';
import { geocodeService } from '../services/geocodeService.js';
import { routeService } from '../services/routeService.js';

const DEFAULT_CENTER = { lat: 23.0225, lng: 72.5714 };

const PlanRoute = () => {
  const [chargers, setChargers] = useState([]);
  const [selectedChargerId, setSelectedChargerId] = useState(null);
  const [startInput, setStartInput] = useState('My Location');
  const [endInput, setEndInput] = useState('');
  const [startLocation, setStartLocation] = useState(null);
  const [endLocation, setEndLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [corridorRadiusKm, setCorridorRadiusKm] = useState(5);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [center, setCenter] = useState(DEFAULT_CENTER);

  const runGeocode = async (query) => {
    const place = await geocodeService.first(query);
    if (!place) throw new Error('Location not found');
    return { lat: place.lat, lng: place.lng, label: place.displayName };
  };

  const resolveMyLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Unable to fetch your location'))
      );
    });

  const resolveLocation = async (input, type) => {
    if (!input || input.toLowerCase() === 'my location') {
      const coords = await resolveMyLocation();
      if (type === 'start') setStartLocation(coords);
      if (type === 'end') setEndLocation(coords);
      return coords;
    }

    const place = await runGeocode(input);
    const coords = { lat: place.lat, lng: place.lng };
    if (type === 'start') setStartLocation(coords);
    if (type === 'end') setEndLocation(coords);
    return coords;
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    if (!endInput.trim()) {
      setRouteError('Enter a destination');
      return;
    }

    setRouteLoading(true);
    setRouteError('');

    try {
      const resolvedStart = await resolveLocation(startInput || 'My Location', 'start');
      const resolvedEnd = await resolveLocation(endInput, 'end');
      const { coords, distanceKm, durationMin } = await routeService.getRoute(resolvedStart, resolvedEnd);

      if (!coords.length) {
        setRouteError('No route returned. Try adjusting locations.');
        setRouteCoords([]);
        setRouteInfo(null);
        setChargers([]);
        return;
      }

      setRouteCoords(coords);
      setRouteInfo({ distanceKm, durationMin });
      setCenter(resolvedStart);

      const minLat = Math.min(resolvedStart.lat, resolvedEnd.lat) - 0.5;
      const maxLat = Math.max(resolvedStart.lat, resolvedEnd.lat) + 0.5;
      const minLng = Math.min(resolvedStart.lng, resolvedEnd.lng) - 0.5;
      const maxLng = Math.max(resolvedStart.lng, resolvedEnd.lng) + 0.5;
      const searchLat = (minLat + maxLat) / 2;
      const searchLng = (minLng + maxLng) / 2;

      const response = await chargerService.search({
        lat: searchLat,
        lng: searchLng,
        radius: 300,
      });

      setChargers(response.data?.chargers || []);
      setSelectedChargerId(null);
    } catch (err) {
      setRouteError(err.message || 'Unable to plan route');
      setRouteCoords([]);
      setRouteInfo(null);
      setChargers([]);
    } finally {
      setRouteLoading(false);
    }
  };

  const formatMinutesToHHMM = (minutes) => {
    if (!Number.isFinite(minutes)) return '--:--';
    const total = Math.max(0, Math.round(minutes));
    const hrs = Math.floor(total / 60)
      .toString()
      .padStart(2, '0');
    const mins = (total % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const chargersOnRoute = useMemo(() => {
    if (!routeCoords.length || !corridorRadiusKm) return chargers;
    const line = turf.lineString(routeCoords.map((point) => [point.lng, point.lat]));

    return chargers.filter((charger) => {
      const { lat, lng } = charger.location.coordinates || {};
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;

      const distance = turf.pointToLineDistance(turf.point([lng, lat]), line, {
        units: 'kilometers',
      });
      return distance <= Number(corridorRadiusKm);
    });
  }, [chargers, routeCoords, corridorRadiusKm]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plan a route</h1>
            <p className="text-sm text-gray-600">Drop in start and destination to see chargers along the way.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            Corridor (km)
            <input
              type="number"
              min="1"
              max="50"
              step="0.5"
              value={corridorRadiusKm}
              onChange={(e) => setCorridorRadiusKm(e.target.value)}
              className="input w-20 text-right"
            />
          </label>
        </div>

        <form onSubmit={handleRouteSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-800">Starting point</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500">
                <span className="text-lg">📍</span>
                <input
                  type="text"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  placeholder="My Location"
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setStartInput('My Location')}
                  className="text-xs font-semibold text-primary-600 hover:underline"
                >
                  Use my location
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-800">Destination</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500">
                <span className="text-lg">🏁</span>
                <input
                  type="text"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  placeholder="Enter destination"
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {routeError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {routeError}
            </div>
          )}

          {routeInfo && (
            <div className="flex flex-wrap gap-3 text-sm text-gray-700">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                Distance: {routeInfo.distanceKm?.toFixed(1)} km
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                ETA: {formatMinutesToHHMM(routeInfo.durationMin)} (HH:MM)
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={routeLoading}
            >
              {routeLoading ? 'Routing...' : 'Show route'}
            </button>
            <button
              type="button"
              onClick={() => {
                setRouteCoords([]);
                setRouteInfo(null);
                setRouteError('');
                setChargers([]);
              }}
              className="btn btn-outline"
              disabled={routeLoading}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Chargers on route</p>
            <h2 className="text-xl font-bold text-gray-900">{chargersOnRoute.length} results</h2>
          </div>
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-gray-100">
            {chargersOnRoute.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">Plan a route to view chargers along your path.</div>
            ) : (
              chargersOnRoute.map((charger) => {
                const isActive = selectedChargerId === charger._id;
                return (
                  <div
                    key={charger._id}
                    className={`group flex cursor-pointer gap-3 px-4 py-3 transition hover:bg-gray-50 ${isActive ? 'bg-primary-50' : ''}`}
                    onMouseEnter={() => setSelectedChargerId(charger._id)}
                    onMouseLeave={() => setSelectedChargerId(null)}
                    onClick={() => setSelectedChargerId(charger._id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-gray-900">{charger.title}</p>
                      <p className="truncate text-sm text-gray-600">{charger.location?.address || `${charger.location?.city || ''}, ${charger.location?.state || ''}`}</p>
                      <p className="text-xs text-gray-500">{charger.chargerType} • {charger.connectorType}</p>
                    </div>
                    <p className="text-lg font-bold text-primary-600">${charger.pricePerHour}/hr</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="sticky top-4 h-[calc(100vh-220px)] overflow-hidden rounded-3xl border border-gray-200 shadow-lg">
          <Map
            chargers={chargersOnRoute}
            zoom={12}
            onMarkerClick={(chargerId) => setSelectedChargerId(chargerId)}
            selectedChargerId={selectedChargerId}
            center={[center.lat, center.lng]}
            routeCoords={routeCoords}
            startLocation={startLocation}
            endLocation={endLocation}
            corridorRadiusKm={corridorRadiusKm}
          />
        </div>
      </div>
    </div>
  );
};

export default PlanRoute;
