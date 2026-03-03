import api from './api.js';

export const authService = {
  registerRequestOtp: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  verifySignupOtp: async ({ email, otp }) => {
    const response = await api.post('/auth/register/verify', { email, otp });
    return response.data;
  },

  loginRequestOtp: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  verifyLoginOtp: async ({ email, otp }) => {
    const response = await api.post('/auth/login/verify', { email, otp });
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  requestPasswordChangeOtp: async () => {
    const response = await api.post('/auth/password/otp');
    return response.data;
  },

  changePasswordWithOtp: async (passwordData) => {
    const response = await api.put('/auth/password', passwordData);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async ({ email, otp, newPassword }) => {
    const response = await api.post('/auth/reset-password', { email, otp, newPassword });
    return response.data;
  },

  requestEmailChange: async ({ userId, newEmail }) => {
    const response = await api.post('/auth/request-email-change', { userId, newEmail });
    return response.data;
  },

  verifyEmailChange: async ({ userId, otp }) => {
    const response = await api.post('/auth/verify-email-change', { userId, otp });
    return response.data;
  },

  requestProfileUpdateOtp: async (payload) => {
    const response = await api.post('/auth/profile/otp/request', payload);
    return response.data;
  },

  verifyProfileUpdateOtp: async ({ otp }) => {
    const response = await api.post('/auth/profile/otp/verify', { otp });
    return response.data;
  },
};

