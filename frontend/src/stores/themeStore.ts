import { create } from 'zustand';

export type ThemeMode = 'dark';

interface ThemeState {
  theme: 'dark';
  isDark: boolean;
  setTheme: (mode?: any) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  isDark: true,

  initTheme: () => {
    document.documentElement.classList.add('dark');
    try {
      localStorage.setItem('dandiya_theme', 'dark');
    } catch {}
    set({ theme: 'dark', isDark: true });
  },

  setTheme: () => {
    document.documentElement.classList.add('dark');
    set({ theme: 'dark', isDark: true });
  },

  toggleTheme: () => {
    document.documentElement.classList.add('dark');
    set({ theme: 'dark', isDark: true });
  },
}));
