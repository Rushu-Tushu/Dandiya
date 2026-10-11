import { create } from 'zustand';
import { User, Profile } from '../types';
import { api } from '../lib/api';
import { E2EEService } from '../lib/crypto/e2ee';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initAuth: () => Promise<void>;
  setUserAndProfile: (user: User, profile: Profile) => Promise<void>;
  updateProfileState: (profile: Profile) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,

  initAuth: async () => {
    try {
      const data = await api.getMe();
      set({ user: data.user, profile: data.profile, isAuthenticated: true, isLoading: false });

      // Ensure E2EE keys exist locally and public key is synced to backend
      try {
        const pubKeyStr = await E2EEService.initClientKeys(data.user.id);
        await api.publishKeyBundle(pubKeyStr);
      } catch (cryptoErr) {
        console.warn('[AuthStore] E2EE sync warning:', cryptoErr);
      }
    } catch {
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUserAndProfile: async (user: User, profile: Profile) => {
    set({ user, profile, isAuthenticated: true, isLoading: false });
    try {
      const pubKeyStr = await E2EEService.initClientKeys(user.id);
      await api.publishKeyBundle(pubKeyStr);
    } catch (cryptoErr) {
      console.warn('[AuthStore] Key publishing warning:', cryptoErr);
    }
  },

  updateProfileState: (profile: Profile) => {
    set({ profile });
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
  },
}));
