import api from './api.js';

export const slotService = {
  getGrid: async (chargerId, params = {}) => {
    const response = await api.get(`/chargers/${chargerId}/slots/grid`, { params });
    return response.data?.data;
  },

  getSlots: async (chargerId, params = {}) => {
    const response = await api.get(`/chargers/${chargerId}/slots`, { params });
    return response.data?.data || {};
  },

  createSlot: async (chargerId, payload) => {
    const response = await api.post(`/chargers/${chargerId}/slots`, payload);
    return response.data;
  },

  getTemplate: async (chargerId) => {
    const response = await api.get(`/chargers/${chargerId}/slots/template`);
    return response.data?.data?.template || null;
  },

  saveTemplate: async (chargerId, payload) => {
    const response = await api.put(`/chargers/${chargerId}/slots/template`, payload);
    return response.data?.data?.template || null;
  },

  generateFromTemplate: async (chargerId, payload) => {
    const response = await api.post(`/chargers/${chargerId}/slots/generate`, payload);
    return response.data;
  },

  updateSlot: async (chargerId, slotId, payload) => {
    const response = await api.put(`/chargers/${chargerId}/slots/${slotId}`, payload);
    return response.data;
  },

  deleteSlot: async (chargerId, slotId) => {
    const response = await api.delete(`/chargers/${chargerId}/slots/${slotId}`);
    return response.data;
  },
};
