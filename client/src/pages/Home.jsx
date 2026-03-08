import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="card soft-enter bg-primary-100/90 py-10">
            <h1 className="mb-6 text-4xl font-bold text-primary-900 md:text-5xl">
              Share Your EV Charger, Power the Future
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-lg text-primary-700 md:text-xl">
              Connect with EV drivers in your area. List your charger and earn money while helping the community.
            </p>
            <div className="flex justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary">
                  Get Started
                </Link>
                <Link to="/chargers" className="btn btn-outline">
                  Browse Chargers
                </Link>
              </>
            ) : (
              <Link to="/chargers" className="btn btn-primary">
                Browse Chargers
              </Link>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center text-3xl font-bold text-primary-900">Why Choose ChargeMate.in?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">Easy to Use</h3>
              <p className="text-primary-700">
                Simple booking process. Find, book, and charge in minutes.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">Earn Money</h3>
              <p className="text-primary-700">
                Monetize your charger. Set your own prices and availability.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold mb-2 text-primary-900">Help the Planet</h3>
              <p className="text-primary-700">
                Support the EV community and reduce carbon footprint.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="card py-10">
            <h2 className="mb-4 text-3xl font-bold text-primary-900">Ready to Get Started?</h2>
            <p className="mb-8 text-primary-700">
              Join thousands of EV owners sharing their chargers
            </p>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-primary">
                Create Account
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

