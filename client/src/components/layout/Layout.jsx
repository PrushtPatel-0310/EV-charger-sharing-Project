import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const Layout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              EVCharge
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/chargers" className="text-gray-700 hover:text-primary-600">
                Browse Chargers
              </Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="text-gray-700 hover:text-primary-600">
                    Dashboard
                  </Link>
                  <Link to="/my-bookings" className="text-gray-700 hover:text-primary-600">
                    My Bookings
                  </Link>
                  {user?.role === 'owner' || user?.role === 'both' ? (
                    <>
                      <Link to="/my-chargers" className="text-gray-700 hover:text-primary-600">
                        My Chargers
                      </Link>
                      <Link to="/create-charger" className="btn btn-primary text-sm">
                        List Charger
                      </Link>
                    </>
                  ) : null}
                  <Link to="/profile" className="text-gray-700 hover:text-primary-600">
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-primary-600">
                    Login
                  </Link>
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
              <h3 className="text-lg font-semibold mb-4">EVCharge</h3>
              <p className="text-gray-400">
                Connect EV owners with charging stations. Share, discover, and charge.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/chargers" className="hover:text-white">Browse Chargers</Link></li>
                <li><Link to="/register" className="hover:text-white">List Your Charger</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-gray-400">support@evcharge.com</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; 2024 EVCharge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;

