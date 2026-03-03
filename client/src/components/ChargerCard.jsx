import { useNavigate } from 'react-router-dom';

const ChargerCard = ({ charger, isSelected, onSelect }) => {
  const navigate = useNavigate();
  const status = charger?.isActive && charger?.availability?.isAvailable ? 'Available' : 'Unavailable';
  const statusClasses =
    status === 'Available'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-700';
  const isFastCharging = charger?.chargerType === 'DC Fast' || Number(charger?.powerOutput) >= 50;
  const connectorLabel = charger?.connectorType === 'CCS' ? 'CCS2' : charger?.connectorType;
  const rating = Number(charger?.rating || 0).toFixed(1);
  const reviewCount = charger?.totalReviews || 0;
  const price = Number(charger?.pricePerKwh ?? charger?.pricePerHour ?? 0);
  const priceUnit = charger?.pricePerKwh != null ? 'kWh' : 'hr';

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
      <div className="h-[60%] w-full bg-gray-100">
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
          <h3 className="truncate text-lg font-bold text-gray-900">{charger.title}</h3>
          <p className="truncate text-xs text-gray-500 opacity-80">
            {charger.location?.address || `${charger.location?.city || ''}, ${charger.location?.state || ''}`}
          </p>
          <p className="text-lg font-bold text-green-600">₹{price} / {priceUnit}</p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses}`}>
              {status}
            </span>
            {isFastCharging && (
              <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                ⚡ Fast Charging
              </span>
            )}
            {connectorLabel && (
              <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {connectorLabel}
              </span>
            )}
            {charger?.powerOutput != null && (
              <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {charger.powerOutput}kW
              </span>
            )}
          </div>

          <div className="pt-1 text-xs text-gray-600">
            ⭐ {rating} <span className="text-gray-500">({reviewCount})</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChargerCard;
