import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService } from '../services/bookingService.js';
import { chatService } from '../services/chatService.js';
import { useAuth } from '../context/AuthContext.jsx';

const Booking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await bookingService.getById(id);
      setBooking(response.data.booking);
      setError('');
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Unable to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setProcessing(true);
      setError('');
      setInfo('');
      await bookingService.checkIn(id);
      setInfo('Checked in successfully.');
      fetchBooking();
    } catch (err) {
      const message = err?.response?.data?.message || 'Check-in and check-out are only allowed during your booked slot time.';
      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckout = async () => {
    try {
      setProcessing(true);
      setError('');
      setInfo('');
      await bookingService.checkOut(id);
      setInfo('Checked out successfully.');
      fetchBooking();
    } catch (err) {
      const message = err?.response?.data?.message || 'Check-in and check-out are only allowed during your booked slot time.';
      setError(message);
    } finally {
      setProcessing(false);
      setShowCheckoutConfirm(false);
    }
  };

  const handleMessageOwner = async () => {
    if (!booking) return;
    try {
      setChatLoading(true);
      setChatError('');
      const res = await chatService.startOrUpgrade({ chargerId: booking.charger._id, bookingId: booking._id });
      const chatId = res.data.chat._id;
      navigate(`/chats/${chatId}`, { state: { chargerId: booking.charger._id, bookingId: booking._id } });
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to open chat';
      setChatError(message);
    } finally {
      setChatLoading(false);
    }
  };

  const canCancel = useMemo(() => {
    if (!booking || !user) return false;
    const isRenter = booking.renter?._id === user._id || booking.renter === user._id;
    const start = new Date(booking.startTime).getTime();
    return isRenter && !['cancelled', 'completed'].includes(booking.status) && start > Date.now();
  }, [booking, user]);

  const handleCancelBooking = () => {
    setError('');
    setInfo('');
    setShowCancelConfirm(true);
  };

  const confirmCancellation = async () => {
    if (!booking) return;
    try {
      setCancelling(true);
      setError('');
      setInfo('');
      const response = await bookingService.cancel(booking._id);
      const updatedBooking = response.data?.booking;
      const renterWalletBalance = response.data?.renterWalletBalance;
      if (updatedBooking) setBooking(updatedBooking);
      if (user && typeof renterWalletBalance === 'number') {
        updateUser({ ...user, walletBalance: renterWalletBalance });
      }
      setInfo('Booking cancelled successfully.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to cancel booking';
      setError(message);
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Booking not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Booking Details</h1>

      {info && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {info}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">{booking.charger.title}</h2>
        <div className="space-y-2 mb-6">
          <p>
            <span className="font-semibold">Status:</span>{' '}
            <span className="capitalize">{booking.status}</span>
          </p>
          <p>
            <span className="font-semibold">Start Time:</span>{' '}
            {new Date(booking.startTime).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">End Time:</span>{' '}
            {new Date(booking.endTime).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold">Duration:</span> {booking.duration} hours
          </p>
          <p>
            <span className="font-semibold">Total Price:</span> ₹{booking.totalPrice}
          </p>
          <p>
            <span className="font-semibold">Payment Method:</span>{' '}
            <span className="capitalize">{booking.paymentMethod || 'wallet'}</span>
          </p>
          <p>
            <span className="font-semibold">Payment Status:</span>{' '}
            <span className="capitalize">{booking.paymentStatus}</span>
          </p>
          {booking.timeSlots?.length > 0 && (
            <div>
              <span className="font-semibold">Slots:</span>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {booking.timeSlots.map((slot) => (
                  <li key={slot.start}>
                    {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' '}
                    -
                    {' '}
                    {new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

          {chatError && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {chatError}
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-3">
            <button
              onClick={handleMessageOwner}
              className="btn btn-outline"
              disabled={chatLoading}
            >
              {chatLoading ? 'Opening chat...' : 'Message owner'}
            </button>
            {canCancel && (
              <button
                onClick={handleCancelBooking}
                className="btn btn-secondary"
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Cancel booking'}
              </button>
            )}
          </div>

        {booking.status === 'confirmed' && (
          <div className="flex gap-4">
            <button
              onClick={handleCheckIn}
              className="btn btn-primary"
              disabled={processing}
            >
              {processing ? 'Working...' : 'Check In'}
            </button>
          </div>
        )}

        {booking.status === 'active' && (
          <div className="flex gap-4">
            <button
              onClick={() => {
                setShowCheckoutConfirm(true);
                setError('');
                setInfo('');
              }}
              className="btn btn-primary"
              disabled={processing}
            >
              Check Out
            </button>
          </div>
        )}
      </div>

      {showCheckoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-600">
              ⚠️
            </div>
            <h3 className="text-center text-xl font-bold text-gray-900">Confirm checkout?</h3>
            <p className="mt-2 text-center text-sm text-gray-700">
              If you check out earlier, your money will not be refunded. You will be fully charged for your slot.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="btn btn-outline"
                onClick={() => setShowCheckoutConfirm(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={processing}
                onClick={handleCheckout}
              >
                {processing ? 'Working...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
              ⚠️
            </div>
            <h3 className="text-center text-xl font-bold text-gray-900">Are you sure you want to cancel?</h3>
            <p className="mt-2 text-center text-sm text-gray-700">This will release your slot and refund the amount back to your wallet.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="btn btn-outline"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                Keep booking
              </button>
              <button
                className="btn btn-primary"
                disabled={cancelling}
                onClick={confirmCancellation}
              >
                {cancelling ? 'Cancelling...' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;

