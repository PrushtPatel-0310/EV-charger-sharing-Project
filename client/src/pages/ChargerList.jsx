import { useEffect, useMemo, useState } from 'react';
import { chargerService } from '../services/chargerService.js';
import ChargerCard from '../components/ChargerCard.jsx';
import FilterBar from '../components/FilterBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_FILTERS = {
  maxPrice: 1000,
  distance: 'any',
  chargerType: 'any',
  powerOutput: 'any',
  availableNow: false,
};

const ChargerList = () => {
  const { user } = useAuth();
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChargerId, setSelectedChargerId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState('nearest');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const getPrice = (charger) => Number(charger?.pricePerKwh ?? charger?.pricePerHour ?? 0);
  const getDistance = (charger) => {
    const distance = charger?.distanceKm ?? charger?.distance;
    const parsed = Number(distance);
    return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
  };
  const getPowerOutput = (charger) => Number(charger?.powerOutput ?? 0);
  const getRating = (charger) => Number(charger?.rating ?? 0);

  const priceCeiling = useMemo(() => {
    const maxPrice = chargers.reduce((max, charger) => Math.max(max, getPrice(charger)), 0);
    return Math.max(100, Math.ceil(maxPrice / 10) * 10);
  }, [chargers]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      maxPrice: Math.min(prev.maxPrice, priceCeiling),
    }));
  }, [priceCeiling]);

  const clearFilters = () => {
    setFilters({ ...DEFAULT_FILTERS, maxPrice: priceCeiling });
    setSortBy('nearest');
  };

  const visibleChargers = useMemo(() => {
    const currentUserId = user?._id;

    const filtered = chargers.filter((charger) => {
      const ownerId =
        typeof charger?.owner === 'string'
          ? charger.owner
          : charger?.owner?._id || charger?.ownerId;

      const isOwnCharger = !!currentUserId && ownerId?.toString() === currentUserId.toString();
      const isDisabled = charger?.disabledPermanently === true;

      if (isOwnCharger || isDisabled) return false;

      if (filters.availableNow && charger?.availability?.isAvailable === false) return false;

      // If the slider is at max, treat price as "no filter".
      if (filters.maxPrice < priceCeiling && getPrice(charger) > filters.maxPrice) return false;

      if (filters.distance !== 'any' && getDistance(charger) > Number(filters.distance)) return false;

      if (filters.chargerType === 'ac' && charger?.chargerType === 'DC Fast') return false;
      if (filters.chargerType === 'dc' && charger?.chargerType !== 'DC Fast') return false;

      const powerOutput = getPowerOutput(charger);
      if (filters.powerOutput === 'low' && powerOutput > 22) return false;
      if (filters.powerOutput === 'mid' && (powerOutput < 23 || powerOutput > 49)) return false;
      if (filters.powerOutput === 'high' && powerOutput < 50) return false;

      return true;
    });

    return filtered.sort((first, second) => {
      if (sortBy === 'cheapest') return getPrice(first) - getPrice(second);
      if (sortBy === 'fastest') return getPowerOutput(second) - getPowerOutput(first);
      if (sortBy === 'topRated') {
        const ratingDiff = getRating(second) - getRating(first);
        if (ratingDiff !== 0) return ratingDiff;
        return (second?.totalReviews || 0) - (first?.totalReviews || 0);
      }

      return getDistance(first) - getDistance(second);
    });
  }, [chargers, filters, sortBy, user?._id]);

  const fetchChargers = async () => {
    try {
      setLoading(true);
      const response = await chargerService.getAll({ page: 1, limit: 200 });
      setChargers(response.data?.chargers || []);
    } catch (error) {
      console.error('Error fetching chargers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChargers();
  }, []);

  if (loading && chargers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Browse Chargers</p>
            <h1 className="text-2xl font-bold text-gray-900">{visibleChargers.length} chargers</h1>
          </div>
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
            </svg>
            Filters
          </button>
        </div>

        {isFilterPanelOpen && (
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onClear={clearFilters}
            onClose={() => setIsFilterPanelOpen(false)}
            priceCeiling={priceCeiling}
          />
        )}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="p-4">
            {visibleChargers.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">No chargers found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visibleChargers.map((charger) => (
                  <ChargerCard
                    key={charger._id}
                    charger={charger}
                    isSelected={selectedChargerId === charger._id}
                    onSelect={() => setSelectedChargerId(charger._id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargerList;
