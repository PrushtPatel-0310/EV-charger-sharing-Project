const FilterBar = ({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  onClear,
  onClose,
  priceCeiling = 1000,
}) => {
  const handleChange = (key, value) => {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
  };

  const isPriceFilterActive = filters.maxPrice < priceCeiling;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Filter Chargers</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">Price Range</div>
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={5}
            value={filters.maxPrice}
            onChange={(event) => handleChange('maxPrice', Number(event.target.value))}
            className="w-full"
          />
            <div className="mt-1 text-xs text-gray-500">
              {isPriceFilterActive ? `Up to ₹${filters.maxPrice} / kWh` : `Max set (₹${priceCeiling}): showing all prices`}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Distance</label>
          <select
            value={filters.distance}
            onChange={(event) => handleChange('distance', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="any">Any</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
          </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">Charger Type</div>
          <div className="flex rounded-lg border border-gray-300 p-1">
            <button
              type="button"
              onClick={() => handleChange('chargerType', 'any')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
                filters.chargerType === 'any' ? 'bg-primary-600 text-white' : 'text-gray-600'
              }`}
            >
              Any
            </button>
            <button
              type="button"
              onClick={() => handleChange('chargerType', 'ac')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
                filters.chargerType === 'ac' ? 'bg-primary-600 text-white' : 'text-gray-600'
              }`}
            >
              AC
            </button>
            <button
              type="button"
              onClick={() => handleChange('chargerType', 'dc')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
                filters.chargerType === 'dc' ? 'bg-primary-600 text-white' : 'text-gray-600'
              }`}
            >
              DC
            </button>
          </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Power Output</label>
          <select
            value={filters.powerOutput}
            onChange={(event) => handleChange('powerOutput', event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="any">Any</option>
            <option value="low">Up to 22kW</option>
            <option value="mid">23-49kW</option>
            <option value="high">50kW+</option>
          </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-gray-600">Available Now</div>
          <button
            type="button"
            onClick={() => handleChange('availableNow', !filters.availableNow)}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filters.availableNow ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {filters.availableNow ? 'On' : 'Off'}
          </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Sort by</label>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="cheapest">Cheapest</option>
            <option value="fastest">Fastest Charging</option>
            <option value="topRated">Top Rated</option>
          </select>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Clear Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;