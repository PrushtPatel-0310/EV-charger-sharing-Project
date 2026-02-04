import api from './api.js';

export const aiService = {
  getRecommendations: async (data) => {
    const response = await api.post('/ai/recommendations', data);
    return response.data;
  },

  getPriceSuggestion: async (chargerId, context) => {
    const response = await api.post('/ai/price-suggestion', {
      chargerId,
      context,
    });
    return response.data;
  },

  chat: async (message) => {
    const response = await api.post('/ai/chat', { message });
    return response.data;
  },

  getAnalytics: async (chargerId, timeRange = '30d') => {
    const response = await api.get(`/ai/analytics/${chargerId}`, {
      params: { timeRange },
    });
    return response.data;
  },
};

