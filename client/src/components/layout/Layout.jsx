import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { NeuButton, NeuNavbar } from '../ui/index.js';

const Layout = () => {
  const { user, isAuthenticated } = useAuth();
  const avatarInitial = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();
  const unreadCount = Number(user?.unreadChats || user?.unreadMessages || 0);
  const unreadBadge = unreadCount > 99 ? '99+' : unreadCount;
  const tabClassName = ({ isActive }) =>
    `rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-primary-200 text-primary-800 shadow-neu-inset'
        : 'text-primary-700 hover:bg-primary-100 hover:shadow-neu-sm'
    }`;

  return (
    <div className="min-h-screen flex flex-col text-primary-900">
      <NeuNavbar title="ChargeMate.in">
        <div className="flex items-center gap-2 md:gap-3">
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
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-800 shadow-neu"
                      aria-label="Profile"
                    >
                      {avatarInitial}
                    </Link>
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
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
                  <NeuButton as={Link} to="/register" variant="primary">
                    Sign Up
                  </NeuButton>
                </>
              )}
            </div>
      </NeuNavbar>

      <main className="flex-1 pt-3">
        <Outlet />
      </main>

      <footer className="mt-auto px-4 pb-3 pt-4">
        <div className="container mx-auto rounded-2xl bg-primary-100 px-5 py-4 shadow-neu">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <h3 className="mb-2 text-base font-bold text-primary-800">ChargeMate.in</h3>
              <p className="text-sm text-primary-700/80">
                Connect EV owners with charging stations. Share, discover, and charge.
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-base font-bold text-primary-800">Quick Links</h3>
              <ul className="space-y-1 text-sm text-primary-700/80">
                <li><Link to="/chargers" className="hover:text-primary-900">Browse Chargers</Link></li>
                <li><Link to="/plan-route" className="hover:text-primary-900">Plan Route</Link></li>
                <li><Link to="/search-location" className="hover:text-primary-900">Search Location</Link></li>
                <li><Link to="/register" className="hover:text-primary-900">List Your Charger</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-base font-bold text-primary-800">Contact</h3>
              <a
                href="mailto:support@chargemate.in"
                className="text-sm text-primary-700/80 underline-offset-2 hover:text-primary-900 hover:underline"
              >
                support@chargemate.in
              </a>
            </div>
          </div>
          <div className="mt-4 border-t border-primary-200 pt-3 text-center text-xs text-primary-700/80">
            <p>&copy; 2026 ChargeMate.in. All rights reserved.</p>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <p className="py-1 text-center text-[11px] text-primary-700/60">Built for clean EV journeys.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

