import { create } from 'zustand';
import { pointsApi } from '../services/api';

const usePointsStore = create((set, get) => ({
  saldoActual: 0,
  totalAcumulado: 0,
  totalCanjeado: 0,
  rachaLogin: { dias: 0, ultimoLogin: null, graceUsados: 0 },
  rachaReservas: { semanasConsecutivas: 0, multiplicador: 1 },
  ledger: [],
  ledgerLoading: false,
  balanceLoading: false,
  descuentoPendiente: null,

  fetchBalance: async () => {
    set({ balanceLoading: true });
    try {
      const data = await pointsApi.getBalance();
      set({ ...data, balanceLoading: false });
    } catch (err) {
      // Sin sesión / 401: estado esperado, no es un error.
      if (!err.noSession && err.status !== 401) {
        console.error('Failed to fetch balance:', err);
      }
      set({ balanceLoading: false });
    }
  },

  fetchLedger: async (params = {}) => {
    set({ ledgerLoading: true });
    try {
      const data = await pointsApi.getLedger(params);
      set({ ledger: data.data, ledgerLoading: false });
    } catch (err) {
      if (!err.noSession && err.status !== 401) {
        console.error('Failed to fetch ledger:', err);
      }
      set({ ledgerLoading: false });
    }
  },

  claimDailyLogin: async () => {
    try {
      const result = await pointsApi.dailyLogin();
      if (!result.yaReclamado) {
        set((state) => ({
          saldoActual: result.nuevoSaldo || state.saldoActual + (result.puntos || 0),
          rachaLogin: result.racha || state.rachaLogin,
        }));
      }
      return result;
    } catch (err) {
      console.error('Failed to claim daily login:', err);
      throw err;
    }
  },

  redeem: async (puntos) => {
    try {
      const result = await pointsApi.redeem(puntos);
      set((state) => ({
        saldoActual: result.nuevoSaldo,
        totalCanjeado: state.totalCanjeado + puntos,
      }));
      return result;
    } catch (err) {
      console.error('Failed to redeem:', err);
      throw err;
    }
  },

  claimDiscount: async (euros) => {
    try {
      const result = await pointsApi.claimDiscount(euros);
      set((state) => ({
        saldoActual: result.nuevoSaldo ?? state.saldoActual,
        totalCanjeado: state.totalCanjeado + (result.descuentoPendiente?.puntos || 0),
        descuentoPendiente: result.descuentoPendiente || null,
      }));
      return result;
    } catch (err) {
      console.error('Failed to claim discount:', err);
      throw err;
    }
  },

  submitReview: async (data) => {
    try {
      const result = await pointsApi.review(data);
      set((state) => ({
        saldoActual: result.nuevoSaldo || state.saldoActual + result.puntos,
      }));
      return result;
    } catch (err) {
      console.error('Failed to submit review:', err);
      throw err;
    }
  },
}));

export default usePointsStore;
