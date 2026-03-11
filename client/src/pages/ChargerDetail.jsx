import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { chargerService } from '../services/chargerService.js';
import { bookingService } from '../services/bookingService.js';
import { slotService } from '../services/slotService.js';
import { chatService } from '../services/chatService.js';
import { reviewService } from '../services/reviewService.js';
import { useAuth } from '../context/AuthContext.jsx';
import Map from '../components/Map.jsx';

const ChargerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, updateUser } = useAuth();

  const [charger, setCharger] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState('');
    const [slots, setSlots] = useState([]);
    const [slotTimezone, setSlotTimezone] = useState('UTC');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const [confirmationDetails, setConfirmationDetails] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const isSelectedDateToday = selectedDate === todayIso;

  /* ------------------ FETCH CHARGER ------------------ */
  useEffect(() => {
    async function fetchCharger() {
      try {
        const res = await chargerService.getById(id);
        setCharger(res.data.charger);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCharger();
    setSelectedDate(new Date().toISOString().slice(0, 10));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    async function loadReviews() {
      try {
        setReviewsLoading(true);
        setReviewsError('');
        const res = await reviewService.getByCharger(id, { limit: 3 });
        setReviews(res.data?.reviews || []);
      } catch (err) {
        setReviewsError('Failed to load reviews');
      } finally {
        setReviewsLoading(false);
      }
    }

    loadReviews();
  }, [id]);

  /* ------------------ LOAD SLOTS ------------------ */
  useEffect(() => {
    if (!selectedDate) return;

    const todayISO = new Date().toISOString().slice(0, 10);
    if (selectedDate < todayISO) {
      setSlots([]);
      setStartTime('');
      setEndTime('');
      setSelectionError('');
      setSlotsError('Past dates cannot be booked');
      return;
    }

    async function loadSlots() {
      try {
        setLoadingSlots(true);
        setSlotsError('');
        const data = await slotService.getGrid(id, { date: selectedDate });
        setSlots(data.slots || []);
        setStartTime('');
        setEndTime('');
        setSelectionError('');
          if (data?.timezone) setSlotTimezone(data.timezone);
      } catch (err) {
        setSlotsError('Failed to load slots');
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedDate, id]);

  /* ------------------ HELPERS ------------------ */
    const formatTime = (iso) => {
      // Display slots in the charger-configured timezone to avoid UTC offset drift on the client.
      return new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: slotTimezone || 'UTC',
      }).format(new Date(iso));
    };

  const parseTimeParts = (slotTime) => {
    if (!slotTime) return null;
    const normalized = String(slotTime).trim().toUpperCase();

    const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
      const hour = Number(twentyFourHourMatch[1]);
      const minute = Number(twentyFourHourMatch[2]);
      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return { hour, minute };
      }
      return null;
    }

    const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (twelveHourMatch) {
      let hour = Number(twelveHourMatch[1]);
      const minute = Number(twelveHourMatch[2]);
      const period = twelveHourMatch[3];

      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
        return null;
      }

      if (period === 'AM') {
        hour = hour === 12 ? 0 : hour;
      } else {
        hour = hour === 12 ? 12 : hour + 12;
      }

      return { hour, minute };
    }

    return null;
  };

  const parseSelectedDateLocal = (value) => {
    if (!value) return null;

    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        return new Date(year, month, day, 0, 0, 0, 0);
      }
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 0, 0, 0, 0);
  };

  const extractSlotStartTime = (slot) => {
    if (slot?.startTime) {
      return slot.startTime;
    }

    if (!slot?.start) {
      return null;
    }

    if (!slot?.start) {
      return null;
    }

    return formatTime(slot.start).replace(/\s+/g, ' ').trim();
  };

  const isSlotInPast = (slotDate, slotTime) => {
    const timeParts = parseTimeParts(slotTime);
    if (!timeParts) return false;

    const dateBase = parseSelectedDateLocal(slotDate);
    if (!dateBase) return false;

    const slotDateTime = new Date(dateBase);
    slotDateTime.setHours(timeParts.hour, timeParts.minute, 0, 0);

    return slotDateTime.getTime() < Date.now();
  };

  const formatDateDisplay = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const isSlotInSelection = (slot) =>
    !!startTime &&
    !!endTime &&
    slot.start >= startTime &&
    slot.end <= endTime;

  const toggleSelection = (slot) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }

    setSelectionError('');

    const slotStartTime = extractSlotStartTime(slot);
    if (isSlotInPast(selectedDate || slot.start, slotStartTime)) {
      setSelectionError('Cannot book past time slots.');
      alert('Cannot book past time slots.');
      return;
    }

    // Deselect when clicking inside current selection
    if (isSlotInSelection(slot)) {
      setStartTime('');
      setEndTime('');
      return;
    }

    if (!startTime) {
      setStartTime(slot.start);
      setEndTime(slot.end);
      return;
    }

    const rangeStart = new Date(slot.start) < new Date(startTime) ? slot.start : startTime;
    const rangeEnd = new Date(slot.end) > new Date(endTime || slot.end) ? slot.end : endTime;

    const available = slots
      .filter((s) => s.status === 'available')
      .filter((s) => !isSlotInPast(selectedDate || s.start, extractSlotStartTime(s)))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    const inRange = available.filter(
      (s) => s.start >= rangeStart && s.end <= rangeEnd
    );

    if (!inRange.length) {
      setSelectionError('Select available continuous slots.');
      return;
    }

    if (inRange.length > 4) {
      setSelectionError('You can book up to 2 hours (4 slots) at a time.');
      return;
    }

    const isContiguous = inRange.every((s, idx) => {
      if (idx === 0) return s.start === rangeStart;
      return s.start === inRange[idx - 1].end;
    });

    const matchesRange =
      inRange[0].start === rangeStart &&
      inRange[inRange.length - 1].end === rangeEnd;

    if (!isContiguous || !matchesRange) {
      setSelectionError('Slots must be continuous without gaps.');
      return;
    }

    setStartTime(rangeStart);
    setEndTime(rangeEnd);
  };

  const selectedSlotsList = useMemo(() => {
    if (!startTime || !endTime) return [];
    return slots.filter(
      (s) =>
        s.start >= startTime &&
        s.end <= endTime &&
        s.status === 'available' &&
        !isSlotInPast(selectedDate || s.start, extractSlotStartTime(s))
    );
  }, [slots, startTime, endTime, selectedDate]);

  const pricePerSlot = charger ? charger.pricePerHour / 2 : 0;
  const totalAmount = selectedSlotsList.length * pricePerSlot;
  const walletBalance = user?.walletBalance ?? 0;
  const hasInsufficientBalance = walletBalance < totalAmount;

 const isOwner = user && charger && String(charger.owner?._id || charger.owner) === String(user._id);

  /* ------------------ BOOKING ------------------ */
  const handleBook = (e) => {
    e.preventDefault();
    if (selectedSlotsList.length < 1) {
      setSelectionError('Select at least one 30-minute slot.');
      return;
    }
    if (selectedSlotsList.length > 4) {
      setSelectionError('You can book up to 2 hours (4 slots).');
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
      navigate('/login', { state: { redirectTo: location.pathname } });
      return;
    }
    setShowConfirm(true);
  };

  const closeConfirm = () => {
    setShowConfirm(false);
    setBookingError('');
  };

  const confirmBooking = async () => {
    try {
      setSubmitting(true);
      setBookingError('');

      if (!selectedSlotsList.length) {
        setBookingError('Please select at least one slot.');
        setSubmitting(false);
        return;
      }

      await bookingService.create({
        chargerId: id,
        date: selectedDate,
        slots: selectedSlotsList,
      });

      updateUser({
        ...user,
        walletBalance: walletBalance - totalAmount,
      });

      setShowConfirm(false);
      setConfirmationDetails({
        date: selectedDate,
        slotCount: selectedSlotsList.length,
        total: totalAmount,
      });
      setShowSuccess(true);
      setStartTime('');
      setEndTime('');
    } catch (err) {
      const apiMessage = err.response?.data?.error?.message;
      setBookingError(apiMessage || 'Booking failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    try {
      setChatLoading(true);
      setChatError('');
      const res = await chatService.startOrUpgrade({ chargerId: id });
      const chatId = res.data.chat._id;
      navigate(`/chats/${chatId}`, { state: { chargerId: id } });
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to start chat';
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (!charger) return <p className="text-center py-10">Charger not found</p>;

  /* ------------------ JSX ------------------ */
  return (
  <>
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* LEFT: Images + Map */}
        <div className="space-y-6">
          {/* Image */}
          <div className="rounded-xl overflow-hidden shadow">
            {charger.images?.length ? (
              <img
                src={charger.images[selectedImageIndex]}
                alt={charger.title}
                className="w-full h-80 object-cover"
              />
            ) : (
              <div className="h-80 bg-gray-200 flex items-center justify-center">
                No Image
              </div>
            )}
          </div>

          {/* Map */}
          <div className="rounded-xl overflow-hidden border">
            <div className="px-4 py-2 font-semibold bg-gray-50">
              Location
            </div>
            <div className="h-64">
              <Map
                chargers={[charger]}
                center={[
                  charger.location.coordinates.lat,
                  charger.location.coordinates.lng,
                ]}
                zoom={15}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Details + Booking */}
        <div className="space-y-6">
          {/* Charger Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-3xl font-bold">{charger.title}</h1>
            <p className="text-gray-600 mt-2">{charger.description}</p>

            <div className="mt-3 text-sm text-gray-800">
              <span className="font-semibold">Rating:</span>{' '}
              {charger.totalReviews > 0 ? (
                <span>⭐ {charger.rating} ({charger.totalReviews} reviews)</span>
              ) : (
                <span>No reviews yet</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div><b>Type:</b> {charger.chargerType}</div>
              <div><b>Connector:</b> {charger.connectorType}</div>
              <div><b>Power:</b> {charger.powerOutput} kW</div>
              <div><b>Price:</b> ₹{charger.pricePerHour}/hour</div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="bg-white rounded-xl shadow p-6">
  <h2 className="text-xl font-bold mb-4">Book Charger</h2>

  {isOwner && (
    <p className="text-gray-600 text-sm mb-3">
      You own this charger. Slots are view-only.
    </p>
  )}

  {/* Date */}
  <label className="block text-sm font-medium mb-1">Select Date</label>
  <input
    type="date"
    className="input mb-4 w-full"
    value={selectedDate}
    min={new Date().toISOString().slice(0, 10)}
    onChange={(e) => setSelectedDate(e.target.value)}
     
  />

  {/* Slots */}
  {loadingSlots && <p className="text-sm">Loading slots...</p>}
  {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}

  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
    {slots.map((slot) => {
      const slotStartTime = extractSlotStartTime(slot);
      const isPastSlot = isSlotInPast(selectedDate || slot.start, slotStartTime);
      const isSelected =
        !isOwner &&
        startTime &&
        endTime &&
        slot.start >= startTime &&
        slot.end <= endTime &&
        slot.status === 'available';

      const isDisabledSlot = isOwner || slot.status !== 'available' || isPastSlot;

      return (
        <button
          key={slot.start}
          onClick={() => {
            if (isDisabledSlot) {
              if (isPastSlot) {
                setSelectionError('Cannot book past time slots.');
                alert('Cannot book past time slots.');
              }
              return;
            }
            toggleSelection(slot);
          }}
          disabled={isDisabledSlot}
          className={`text-xs p-2 rounded border transition ${
            isPastSlot
              ? 'bg-gray-200 border-gray-300 text-gray-500 opacity-70 cursor-not-allowed'
              : isSelected
                ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700'
                : slot.status === 'available'
                  ? 'bg-green-100 border-green-300 hover:bg-green-200'
                  : 'bg-red-100 border-red-200 cursor-not-allowed'
          }`}
          title={isPastSlot ? 'Past slots cannot be booked' : ''}
        >
          {formatTime(slot.start)} - {formatTime(slot.end)}
        </button>
      );
    })}
  </div>

  {!isOwner && (
    <>
      {/* Summary */}
      <div className="text-sm space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Slots selected</span>
          <span>{selectedSlotsList.length}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Wallet</span>
          <span>₹{walletBalance.toFixed(2)}</span>
        </div>
      </div>

      {hasInsufficientBalance && (
        <p className="text-xs text-red-600 mb-2">Insufficient wallet balance</p>
      )}
      {selectionError && (
        <p className="text-xs text-red-600 mb-2">{selectionError}</p>
      )}
      {chatError && (
        <p className="text-xs text-red-600 mb-2">{chatError}</p>
      )}

      <button
        onClick={handleStartChat}
        disabled={chatLoading}
        className="btn btn-outline w-full mb-2"
      >
        {chatLoading ? 'Opening chat...' : 'Message owner'}
      </button>

      <button
        onClick={handleBook}
        disabled={!selectedSlotsList.length}
        className="btn btn-primary w-full"
      >
        Book Now
      </button>
    </>
  )}
</div>
           
        </div>
      </div>
    </div>

    <div className="container mx-auto max-w-6xl px-4 pb-10">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Reviews</h2>
          <div className="text-sm text-gray-700">
            {charger.totalReviews > 0 ? (
              <span>Average: ⭐ {charger.rating} ({charger.totalReviews} reviews)</span>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
        </div>

        {reviewsLoading && <p className="text-sm">Loading reviews...</p>}
        {reviewsError && <p className="text-sm text-red-600">{reviewsError}</p>}

        {!reviewsLoading && !reviewsError && (
          reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-800">{review.user?.name || 'Guest'}</div>
                    <div className="text-sm text-gray-700">⭐ {review.rating}</div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-700 whitespace-pre-line">{review.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">{new Date(review.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No reviews yet</p>
          )
        )}
      </div>
    </div>

    {/* CONFIRM MODAL */}
    {showConfirm && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h3 className="text-xl font-bold mb-3">Confirm Booking</h3>

          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Address</span>
              <span className="text-right max-w-[60%]">
                {charger?.location?.address || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{formatDateDisplay(selectedDate)}</span>
            </div>
            <div className="flex justify-between items-start">
              <span>Slots</span>
              <div className="text-right">
                <div className="font-semibold">{selectedSlotsList.length}</div>
                <div className="text-xs text-gray-600 space-y-0.5 mt-1">
                  {selectedSlotsList.map((s) => (
                    <div key={s.start}>
                      {formatTime(s.start)} - {formatTime(s.end)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total Required</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Wallet Balance</span>
              <span>₹{walletBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={closeConfirm} className="btn w-1/2">
              Cancel
            </button>
            <button
              onClick={confirmBooking}
              disabled={hasInsufficientBalance || submitting}
              className="btn btn-primary w-1/2"
            >
              {submitting ? 'Processing...' : 'Confirm'}
            </button>
          </div>

          {bookingError && (
            <p className="text-sm text-red-600 mt-3 text-center">{bookingError}</p>
          )}
        </div>
      </div>
    )}

    {/* SUCCESS MODAL */}
    {showSuccess && confirmationDetails && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-green-600">Slot Confirmed</h3>
          <p className="text-sm text-gray-700">Your booking is confirmed.</p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Date</span>
              <span>{formatDateDisplay(confirmationDetails.date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Slots</span>
              <span>{confirmationDetails.slotCount}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>₹{confirmationDetails.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              className="btn btn-primary w-full"
              onClick={() => navigate('/')}
            >
              Go to Home
            </button>
            <button
              className="btn w-full"
              onClick={() => {
                setShowSuccess(false);
                navigate('/my-bookings');
              }}
            >
              View My Bookings
            </button>
          </div>
        </div>
      </div>
    )}

    {/* LOGIN PROMPT MODAL */}
    {showLoginPrompt && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center space-y-4">
          <h3 className="text-xl font-bold">Login Required</h3>
          <p className="text-sm text-gray-700">You need to log in to book slots.</p>
          <div className="flex gap-3 mt-4">
            <button
              className="btn w-1/2"
              onClick={() => setShowLoginPrompt(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary w-1/2"
              onClick={() => {
                sessionStorage.setItem('redirectAfterLogin', location.pathname);
                navigate('/login', { state: { redirectTo: location.pathname } });
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

};

export default ChargerDetail;
