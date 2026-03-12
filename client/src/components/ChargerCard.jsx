import { useNavigate } from 'react-router-dom';

const ChargerCard = ({ charger, isSelected, onSelect }) => {
  const navigate = useNavigate();
  const status = charger?.isActive && charger?.availability?.isAvailable ? 'Available' : 'Unavailable';
  const statusClasses =
    status === 'Available'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-700';
  const ratingValue = Number(charger?.rating || 0);
  const rating = ratingValue.toFixed(1);
  const isTopRated = ratingValue > 3.5;
  const chargerTypeLabel = charger?.chargerType || 'AC';
  const price = Number(charger?.pricePerKwh ?? charger?.pricePerHour ?? 0);
  const priceUnit = charger?.pricePerKwh != null ? 'kWh' : 'hr';
  const cityName =
    charger?.location?.city ||
    charger?.location?.address?.split(',')?.[0]?.trim() ||
    'Unknown city';

  return (
    <div
      className={`h-[360px] overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
        isSelected
          ? 'border-primary-500 shadow-[0_8px_24px_rgba(59,130,246,0.20)] scale-[1.02]'
          : 'border-gray-200'
      }`}
      onMouseEnter={onSelect}
      onClick={() => navigate(`/chargers/${charger._id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/chargers/${charger._id}`);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative h-[78%] w-full bg-gray-100">
        {charger.images?.length ? (
          <img
            src={charger.images[0]}
            alt={charger.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
            No image
          </div>
        )}

        <div
          className={`absolute right-3 top-3 inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold shadow-sm ${
            isTopRated
              ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
              : 'bg-white text-gray-800'
          }`}
        >
          ⭐ {rating}
        </div>
      </div>

      <div className="flex h-[22%] items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900">{charger.title}</h3>
          <p className="truncate text-xs text-gray-500">{cityName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses}`}>
              {status}
            </span>
            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              {chargerTypeLabel}
            </span>
            {charger?.powerOutput != null && (
              <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {charger.powerOutput}kW
              </span>
            )}
          </div>
        </div>

        <p className="shrink-0 text-right text-2xl font-extrabold leading-none text-green-600">
          ₹{price}
          <span className="block text-[11px] font-semibold text-green-700">/ {priceUnit}</span>
        </p>
      </div>
    </div>
  );
};

export default ChargerCard;
