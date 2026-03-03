import api from './api.js';

export const paymentService = {
  createCheckoutSession: (amount) => api.post('/payment/create-checkout-session', { amount }),
  verifyStripeSession: (payload) => api.post('/payment/verify-session', payload),
  dummyCharge: (payload) => api.post('/payment/dummy-charge', payload),
};
