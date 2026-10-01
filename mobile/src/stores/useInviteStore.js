import { create } from 'zustand';
import { invitationsApi } from '../services/api';

const useInviteStore = create((set) => ({
  invitaciones: [],
  enviadas: [],
  aceptadas: 0,
  puntosTotales: 0,
  loading: false,

  fetchMyInvites: async () => {
    set({ loading: true });
    try {
      const data = await invitationsApi.getMy();
      set({ ...data, loading: false });
    } catch (err) {
      console.error('Failed to fetch invites:', err);
      set({ loading: false });
    }
  },

  createInvite: async (email) => {
    try {
      const result = await invitationsApi.create(email);
      set((state) => ({
        enviadas: [result, ...state.enviadas],
      }));
      return result;
    } catch (err) {
      console.error('Failed to create invite:', err);
      throw err;
    }
  },

  acceptInvite: async (codigo) => {
    try {
      const result = await invitationsApi.accept(codigo);
      return result;
    } catch (err) {
      console.error('Failed to accept invite:', err);
      throw err;
    }
  },
}));

export default useInviteStore;
