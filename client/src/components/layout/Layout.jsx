import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const avatarInitial = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();
  const unreadCount = Number(user?.unreadChats || user?.unreadMessages || 0);
  const unreadBadge = unreadCount > 99 ? '99+' : unreadCount;
  const tabClassName = ({ isActive }) =>
    `border-b-2 pb-1 text-sm font-medium transition-colors ${
      isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-700 hover:text-primary-600'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              ChargeMate.in
            </Link>
            <div className="flex items-center gap-5">
              <NavLink to="/chargers" className={tabClassName}>
                Browse Chargers
              </NavLink>
              <NavLink to="/plan-route" className={tabClassName}>
                Plan Route
              </NavLink>
              <NavLink to="/search-location" className={tabClassName}>
                Search Location
              </NavLink>
              {isAuthenticated ? (
                <>
                  <NavLink to="/my-bookings" className={tabClassName}>
                    My Bookings
                  </NavLink>
                  {user?.role === 'owner' || user?.role === 'both' ? (
                    <>
                      <NavLink to="/my-chargers" className={tabClassName}>
                        My Chargers
                      </NavLink>
                    </>
                  ) : null}
                  <div className="relative ml-1">
                    <Link
                      to="/profile"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 ring-2 ring-primary-200"
                      aria-label="Profile"
                    >
                      {avatarInitial}
                    </Link>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                        {unreadBadge}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={tabClassName}>
                    Login
                  </NavLink>
                  <Link to="/register" className="btn btn-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">ChargeMate.in</h3>
              <p className="text-gray-400">
                Connect EV owners with charging stations. Share, discover, and charge.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/chargers" className="hover:text-white">Browse Chargers</Link></li>
                <li><Link to="/plan-route" className="hover:text-white">Plan Route</Link></li>
                <li><Link to="/search-location" className="hover:text-white">Search Location</Link></li>
                <li><Link to="/register" className="hover:text-white">List Your Charger</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">support@chargemate.in</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; 2026 ChargeMate.in. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

