import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { bookingService } from '../services/bookingService.js';
import { chargerService } from '../services/chargerService.js';
import { NeuButton, NeuCard, NeuWidget } from '../components/ui/index.js';

const Dashboard = () => {
  const { user } = useAuth();
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [myChargers, setMyChargers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookingsRes, chargersRes] = await Promise.all([
          bookingService.getUpcoming().catch(() => ({ data: { bookings: [] } })),
          (user?.role === 'owner' || user?.role === 'both')
            ? chargerService.getMyChargers().catch(() => ({ data: { chargers: [] } }))
            : Promise.resolve({ data: { chargers: [] } }),
        ]);

        setUpcomingBookings(bookingsRes.data?.bookings || []);
        setMyChargers(chargersRes.data?.chargers || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-primary-900">Dashboard</h1>
      <p className="mb-8 text-primary-700">Welcome back, {user?.name}!</p>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <NeuWidget>
          <p className="text-sm font-semibold text-primary-700">Upcoming Bookings</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-900">{upcomingBookings.length}</p>
        </NeuWidget>
        <NeuWidget>
          <p className="text-sm font-semibold text-primary-700">Listed Chargers</p>
          <p className="mt-2 text-3xl font-extrabold text-primary-900">{myChargers.length}</p>
        </NeuWidget>
        <NeuWidget>
          <p className="text-sm font-semibold text-primary-700">Account Role</p>
          <p className="mt-2 text-2xl font-bold capitalize text-primary-900">{user?.role || 'user'}</p>
        </NeuWidget>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upcoming Bookings */}
        <NeuCard>
          <h2 className="mb-4 text-xl font-semibold text-primary-900">Upcoming Bookings</h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <div key={booking._id} className="rounded-xl border border-primary-200 p-3 shadow-neu-sm">
                  <Link
                    to={`/chargers/${booking.charger._id}`}
                    className="font-semibold text-primary-700 hover:underline"
                  >
                    {booking.charger.title}
                  </Link>
                  <p className="text-sm text-primary-700">
                    {new Date(booking.startTime).toLocaleDateString()} -{' '}
                    {new Date(booking.endTime).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-primary-900">${booking.totalPrice}</p>
                </div>
              ))}
              <Link to="/my-bookings" className="text-sm font-semibold text-primary-700 hover:underline">
                View all bookings →
              </Link>
            </div>
          ) : (
            <p className="text-primary-700/80">No upcoming bookings</p>
          )}
        </NeuCard>

        {/* My Chargers */}
        {(user?.role === 'owner' || user?.role === 'both') && (
          <NeuCard>
            <h2 className="mb-4 text-xl font-semibold text-primary-900">My Chargers</h2>
            {myChargers.length > 0 ? (
              <div className="space-y-4">
                {myChargers.slice(0, 3).map((charger) => (
                  <div key={charger._id} className="rounded-xl border border-primary-200 p-3 shadow-neu-sm">
                    <Link
                      to={`/chargers/${charger._id}`}
                      className="font-semibold text-primary-700 hover:underline"
                    >
                      {charger.title}
                    </Link>
                    <p className="text-sm text-primary-700">{charger.location.city}</p>
                    <p className="text-sm font-semibold text-primary-900">${charger.pricePerHour}/hour</p>
                  </div>
                ))}
                <Link to="/my-chargers" className="text-sm font-semibold text-primary-700 hover:underline">
                  View all chargers →
                </Link>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-primary-700/80">No chargers listed yet</p>
                <NeuButton as={Link} to="/create-charger" variant="primary">
                  List Your Charger
                </NeuButton>
              </div>
            )}
          </NeuCard>
        )}
      </div>

      <div className="mt-8">
        <NeuButton as={Link} to="/chargers" variant="primary">
          Browse Chargers
        </NeuButton>
      </div>
    </div>
  );
};

export default Dashboard;

