import api from './api.js';

export const walletService = {
  async getTransactions() {
    return api.get('/wallet/transactions');
  },
};
