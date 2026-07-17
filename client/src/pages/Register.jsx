import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'renter',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(formData);
      navigate('/chargers');
    } catch (err) {
      console.error('Registration error:', err);
      
      // Handle network errors
      if (!err.response) {
        setError('Network error. Please check if the server is running.');
        return;
      }
      
      // Handle validation errors with details
      const errorData = err.response?.data?.error;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const details = errorData.details.map(d => d.message || d).join(', ');
        setError(`${errorData.message || 'Validation failed'}: ${details}`);
      } else {
        const errorMessage = errorData?.message 
          || err.response?.data?.message 
          || err.message 
          || 'Registration failed. Please try again.';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold mb-1">Error:</p>
              <p>{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="input mt-1"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-1"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <>
              <div> 
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700"> Phone </label> 
               <input
  id="phone"
  name="phone"
  type="text"
  className="input mt-1"
  value={formData.phone}
  maxLength={10}
  inputMode="numeric"
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);

    setFormData({
      ...formData,
      phone: value,
    });
  }}
/>
                </div>
                
              <div>
  <label
    htmlFor="password"
    className="block text-sm font-medium text-gray-700"
  >
    Password
  </label>

  <div className="relative mt-1">
    <input
      id="password"
      name="password"
      type={showPassword ? "text" : "password"}
      required
      minLength={6}
      className="input pr-12 w-full"
      value={formData.password}
      onChange={handleChange}
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
    >
      {showPassword ? "Hide" : "Show"}
    </button>
  </div>
</div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  I want to
                </label>
                <select
                  id="role"
                  name="role"
                  className="input mt-1"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="renter">Rent chargers</option>
                  <option value="owner">List my charger</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Processing...' : 'Create account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

