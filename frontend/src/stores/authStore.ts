import { create } from 'zustand';
import { User, Profile } from '../types';
import { api } from '../lib/api';
import { E2EEService } from '../lib/crypto/e2ee';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasKeyBackup: boolean;
  initAuth: () => Promise<void>;
  setUserAndProfile: (user: User, profile: Profile, credential?: string) => Promise<void>;
  updateProfileState: (profile: Profile) => void;
  restoreKeysWithCredential: (credential: string) => Promise<boolean>;
  backupKeysWithCredential: (credential: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  hasKeyBackup: false,

  initAuth: async () => {
    try {
      const data = await api.getMe();
      set({ user: data.user, profile: data.profile, isAuthenticated: true, isLoading: false });

      // Check if user has an encrypted backup on server
      try {
        const backup = await api.getKeyBackup();
        if (backup && backup.encryptedKeyJWK) {
          set({ hasKeyBackup: true });
        }
      } catch {
        set({ hasKeyBackup: false });
      }

      // Ensure E2EE keys exist locally and public key is synced to backend
      try {
        const pubKeyStr = await E2EEService.initClientKeys(data.user.id);
        await api.publishKeyBundle(pubKeyStr);
      } catch (cryptoErr) {
        console.warn('[AuthStore] E2EE key initialization notice:', cryptoErr);
      }
    } catch {
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUserAndProfile: async (user: User, profile: Profile, credential?: string) => {
    set({ user, profile, isAuthenticated: true, isLoading: false });
    try {
      const pubKeyStr = await E2EEService.initClientKeys(user.id, credential);
      await api.publishKeyBundle(pubKeyStr);
      if (credential) {
        set({ hasKeyBackup: true });
      }
    } catch (cryptoErr) {
      console.warn('[AuthStore] E2EE initialization notice:', cryptoErr);
    }
  },

  updateProfileState: (profile: Profile) => {
    set({ profile });
  },

  restoreKeysWithCredential: async (credential: string) => {
    const user = get().user;
    if (!user) return false;
    try {
      const backup = await api.getKeyBackup();
      if (!backup || !backup.encryptedKeyJWK) return false;
      const restored = await E2EEService.restoreFromEncryptedKeyBackup(user.id, backup, credential);
      if (restored) {
        set({ hasKeyBackup: true });
      }
      return restored;
    } catch (err) {
      console.warn('[AuthStore] Key recovery failed:', err);
      return false;
    }
  },

  backupKeysWithCredential: async (credential: string) => {
    const user = get().user;
    if (!user) return false;
    try {
      const backupPayload = await E2EEService.createEncryptedKeyBackup(user.id, credential);
      await api.saveKeyBackup(backupPayload);
      set({ hasKeyBackup: true });
      return true;
    } catch (err) {
      console.warn('[AuthStore] Key backup failed:', err);
      return false;
    }
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
