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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-primary-200 bg-primary-100 p-4 shadow-neu soft-enter">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary-900">Filter Chargers</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn px-3 py-1.5 text-xs"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-primary-700">Price Range</div>
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={5}
            value={filters.maxPrice}
            onChange={(event) => handleChange('maxPrice', Number(event.target.value))}
            className="w-full accent-primary-500"
          />
            <div className="mt-1 text-xs text-primary-700/80">
              {isPriceFilterActive ? `Up to ₹${filters.maxPrice} / kWh` : `Max set (₹${priceCeiling}): showing all prices`}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-primary-700">Distance</label>
          <select
            value={filters.distance}
            onChange={(event) => handleChange('distance', event.target.value)}
            className="input w-full"
          >
            <option value="any">Any</option>
            <option value="5">Within 5 km</option>
            <option value="10">Within 10 km</option>
            <option value="25">Within 25 km</option>
            <option value="50">Within 50 km</option>
          </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-primary-700">Charger Type</div>
          <div className="flex rounded-xl border border-primary-200 bg-primary-100 p-1 shadow-neu-inset">
            <button
              type="button"
              onClick={() => handleChange('chargerType', 'any')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
                filters.chargerType === 'any' ? 'bg-primary-500 text-white shadow-neu-sm' : 'text-primary-700'
              }`}
            >
              Any
            </button>
            <button
              type="button"
              onClick={() => handleChange('chargerType', 'ac')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
                filters.chargerType === 'ac' ? 'bg-primary-500 text-white shadow-neu-sm' : 'text-primary-700'
              }`}
            >
              AC
            </button>
            <button
              type="button"
              onClick={() => handleChange('chargerType', 'dc')}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
                filters.chargerType === 'dc' ? 'bg-primary-500 text-white shadow-neu-sm' : 'text-primary-700'
              }`}
            >
              DC
            </button>
          </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-primary-700">Power Output</label>
          <select
            value={filters.powerOutput}
            onChange={(event) => handleChange('powerOutput', event.target.value)}
            className="input w-full"
          >
            <option value="any">Any</option>
            <option value="low">Up to 22kW</option>
            <option value="mid">23-49kW</option>
            <option value="high">50kW+</option>
          </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-primary-700">Available Now</div>
          <button
            type="button"
            onClick={() => handleChange('availableNow', !filters.availableNow)}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filters.availableNow ? 'bg-primary-500 text-white shadow-neu-sm' : 'bg-primary-100 text-primary-700 shadow-neu-inset'
            }`}
          >
            {filters.availableNow ? 'On' : 'Off'}
          </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-primary-700">Sort by</label>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="input w-full"
          >
            <option value="nearest">Nearest</option>
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
            className="btn btn-outline"
          >
            Clear Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;