import { useNavigate } from 'react-router-dom';

const getExpectedChargeTime = (chargerType) => {
  if (chargerType === 'Level 1') return '8-12 hours';
  if (chargerType === 'Level 2') return '2-4 hours';
  if (chargerType === 'DC Fast') return '20-60 min';
  return null;
};

const ChargerCard = ({ charger, isSelected, onSelect }) => {
  const navigate = useNavigate();
  const status = charger?.isActive && charger?.availability?.isAvailable ? 'Available' : 'Unavailable';
  const statusClasses =
    status === 'Available'
      ? 'bg-primary-200 text-primary-800'
      : 'bg-red-100 text-red-700';
  const isFastCharging = charger?.chargerType === 'DC Fast' || Number(charger?.powerOutput) >= 50;
  const connectorLabel = charger?.connectorType === 'CCS' ? 'CCS2' : charger?.connectorType;
  const rawRating = Number(charger?.rating || 0);
  const ratingValue = Number.isFinite(rawRating) ? Math.min(5, Math.max(0, rawRating)) : 0;
  const rating = ratingValue.toFixed(1);
  const reviewCount = charger?.totalReviews || 0;
  const price = Number(charger?.pricePerKwh ?? charger?.pricePerHour ?? 0);
  const priceUnit = charger?.pricePerKwh != null ? 'kWh' : 'hr';
  const expectedChargeTime = getExpectedChargeTime(charger?.chargerType);

  return (
    <div
      className={`h-[360px] overflow-hidden rounded-2xl border border-primary-200 bg-white shadow-neu transition-all duration-300 hover:-translate-y-1 hover:shadow-[12px_12px_22px_#c4e2c6,-12px_-12px_22px_#ffffff] ${
        isSelected
          ? 'border-primary-500 shadow-[inset_4px_4px_10px_#c8e6c9,inset_-4px_-4px_10px_#ffffff] scale-[1.02]'
          : ''
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
      <div className="relative h-[60%] w-full bg-primary-200/60">
        {ratingValue > 3.5 && (
          <div className="absolute right-3 top-3 rounded-full bg-primary-100/95 px-2 py-1 text-xs font-semibold text-primary-900 shadow-neu-sm">
            ⭐ {rating} <span className="text-primary-700">({reviewCount})</span>
          </div>
        )}
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
      </div>

      <div className="flex h-[40%] flex-col p-4">
        <div className="min-h-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold text-primary-900">{charger.title}</h3>
              <p className="truncate text-xs text-primary-700 opacity-80">
                {charger.location?.city || 'City not available'}
              </p>
            </div>
            <p className="shrink-0 text-right text-2xl font-extrabold leading-none text-primary-700">
              ₹{price}
              <span className="ml-1 text-xs font-semibold text-primary-700/80">/{priceUnit}</span>
            </p>
          </div>
          {expectedChargeTime && (
            <p className="truncate text-xs font-medium text-primary-700">
              Full charge: {expectedChargeTime}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses}`}>
              {status}
            </span>
            {isFastCharging && (
              <span className="inline-flex rounded-full bg-primary-300/35 px-2 py-0.5 text-xs font-semibold text-primary-800">
                ⚡ Fast Charging
              </span>
            )}
            {connectorLabel && (
              <span className="inline-flex rounded-full bg-primary-200 px-2 py-0.5 text-xs font-semibold text-primary-800">
                {connectorLabel}
              </span>
            )}
            {charger?.powerOutput != null && (
              <span className="inline-flex rounded-full bg-primary-200 px-2 py-0.5 text-xs font-semibold text-primary-800">
                {charger.powerOutput}kW
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChargerCard;
