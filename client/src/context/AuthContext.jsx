import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await authService.getMe();
          setUser(response.data.user);
        } catch (error) {
          localStorage.removeItem('accessToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    // OTP step 1
    return authService.loginRequestOtp(credentials);
  };

  const register = async (userData) => {
    return authService.registerRequestOtp(userData);
  };

  const verifyLoginOtp = async ({ email, otp }) => {
    const response = await authService.verifyLoginOtp({ email, otp });
    const { user: userPayload, accessToken } = response?.data || {};
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (userPayload) {
      setUser(userPayload);
    }
    return response;
  };

  const verifySignupOtp = async ({ email, otp }) => {
    const response = await authService.verifySignupOtp({ email, otp });
    const { user: userPayload, accessToken } = response?.data || {};
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    }
    if (userPayload) {
      setUser(userPayload);
    }
    return response;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed, clearing session locally', error);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    loading,
    login,
    verifyLoginOtp,
    register,
    verifySignupOtp,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

