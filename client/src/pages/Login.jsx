import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NeuButton, NeuForm, NeuInput } from '../components/ui/index.js';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, verifyLoginOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
      if (step === 'credentials') {
        await login(formData);
        setStep('otp');
      } else {
        await verifyLoginOtp({ email: formData.email, otp });
        const redirect =
          location.state?.redirectTo ||
          sessionStorage.getItem('redirectAfterLogin') ||
          '/my-bookings';
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(redirect);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-primary-900">
            Sign in to your account
          </h2>
        </div>
        <NeuForm className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-neu-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-primary-800">
                Email address
              </label>
              <NeuInput
                id="email"
                name="email"
                type="email"
                required
                className="mt-1"
                value={formData.email}
                onChange={handleChange}
                disabled={step === 'otp'}
              />
            </div>

            {step === 'credentials' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-primary-800">
                  Password
                </label>
                <NeuInput
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            )}

            {step === 'otp' && (
              <div>
                <label className="block text-sm font-medium text-primary-800">OTP</label>
                <NeuInput
                  type="text"
                  maxLength={6}
                  required
                  className="mt-1"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            )}
          </div>

          <div>
            <NeuButton
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full"
            >
              {loading ? 'Processing...' : step === 'credentials' ? 'Send OTP' : 'Verify & Sign in'}
            </NeuButton>
          </div>

          <div className="flex items-center justify-between text-sm text-primary-700">
            <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-primary-700">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </p>
          </div>
        </NeuForm>
      </div>
    </div>
  );
};

export default Login;

