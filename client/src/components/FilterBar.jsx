const FilterBar = ({
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  onClear,
  priceCeiling = 1000,
}) => {
  const handleChange = (key, value) => {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-end gap-3 overflow-x-auto pb-1">
        <div className="min-w-[200px] flex-1">
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
          <div className="mt-1 text-xs text-gray-500">Up to ₹{filters.maxPrice} / kWh</div>
        </div>

        <div className="min-w-[130px]">
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

        <div className="min-w-[150px]">
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

        <div className="min-w-[150px]">
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

        <div className="min-w-[140px]">
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

        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold text-gray-600">Sort by</label>
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="nearest">Nearest</option>
            <option value="cheapest">Cheapest</option>
            <option value="fastest">Fastest Charging</option>
            <option value="topRated">Top Rated</option>
          </select>
        </div>

        <div className="min-w-[120px]">
          <button
            type="button"
            onClick={onClear}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;