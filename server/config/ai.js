// AI API Configuration
export const AI_CONFIG = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    temperature: 0.7,
  },
};

// AI Service endpoints
export const AI_ENDPOINTS = {
  recommendations: '/ai/recommendations',
  priceSuggestion: '/ai/price-suggestion',
  chat: '/ai/chat',
  analytics: '/ai/analytics',
};

