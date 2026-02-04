import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService.js';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [locationFilter, setLocationFilter] = useState('');
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await bookingService.getAll();
      setBookings(response.data?.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Unable to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const sorted = [...bookings].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return sorted.filter((booking) => {
      const start = new Date(booking.startTime).getTime();
      const matchesStart = dateRange.start ? start >= new Date(dateRange.start).getTime() : true;
      const matchesEnd = dateRange.end ? start <= new Date(dateRange.end).getTime() : true;
      const locationText = `${booking.charger?.location?.address || ''} ${booking.charger?.location?.city || ''} ${booking.charger?.location?.state || ''}`.toLowerCase();
      const matchesLocation = locationFilter
        ? locationText.includes(locationFilter.trim().toLowerCase())
        : true;
      return matchesStart && matchesEnd && matchesLocation;
    });
  }, [bookings, dateRange, locationFilter]);

  const visibleBookings = useMemo(
    () => (showAll ? filteredBookings : filteredBookings.slice(0, 5)),
    [filteredBookings, showAll]
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Bookings</h1>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-sm font-semibold text-gray-700">Start date</label>
          <input
            type="date"
            className="input mt-1 w-full"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">End date</label>
          <input
            type="date"
            className="input mt-1 w-full"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700">Location</label>
          <input
            type="text"
            placeholder="City or address"
            className="input mt-1 w-full"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {visibleBookings.map((booking) => (
            <div key={booking._id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <Link
                    to={`/chargers/${booking.charger._id}`}
                    className="text-xl font-semibold text-primary-600 hover:underline"
                  >
                    {booking.charger.title}
                  </Link>
                  <p className="text-gray-600 mt-2">
                    {new Date(booking.startTime).toLocaleString()} -{' '}
                    {new Date(booking.endTime).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Status: <span className="capitalize">{booking.status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">₹{booking.totalPrice}</p>
                  <Link
                    to={`/bookings/${booking._id}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {filteredBookings.length > 5 && (
            <div className="text-center">
              <button
                className="btn btn-outline"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? 'Show Less' : 'Show More'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No bookings found</p>
          <Link to="/chargers" className="btn btn-primary mt-4 inline-block">
            Browse Chargers
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyBookings;

