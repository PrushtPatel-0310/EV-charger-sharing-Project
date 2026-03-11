import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Share Your EV Charger, Power the Future
          </h1>
          <p className="text-xl mb-8 text-primary-100">
            Connect with EV drivers in your area. List your charger and earn money while helping the community.
          </p>
          <div className="flex gap-4 justify-center">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100">
                  Get Started
                </Link>
                <Link to="/chargers" className="btn btn-outline border-white text-white hover:bg-white hover:text-primary-600">
                  Browse Chargers
                </Link>
              </>
            ) : (
              <Link to="/chargers" className="btn bg-white text-primary-600 hover:bg-gray-100">
                Browse Chargers
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose ChargeMate.in?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
              <p className="text-gray-600">
                Simple booking process. Find, book, and charge in minutes.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2">Earn Money</h3>
              <p className="text-gray-600">
                Monetize your charger. Set your own prices and availability.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold mb-2">Help the Planet</h3>
              <p className="text-gray-600">
                Support the EV community and reduce carbon footprint.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8">
            Join thousands of EV owners sharing their chargers
          </p>
          {!isAuthenticated && (
            <Link to="/register" className="btn btn-primary">
              Create Account
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;

