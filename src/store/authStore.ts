import { create } from 'zustand';
import { apiRepository } from './apiRepository';

interface AuthUser {
  id: string;
  username: string;
}

interface AuthState {
  user: AuthUser | null;
  checking: boolean;
  error: string | null;
  checkSession: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  checking: true,
  error: null,

  checkSession: async () => {
    set({ checking: true, error: null });
    try {
      const user = await apiRepository.me();
      set({ user, checking: false });
      return true;
    } catch {
      set({ user: null, checking: false });
      return false;
    }
  },

  login: async (username, password) => {
    set({ error: null });
    const user = await apiRepository.login(username, password);
    set({ user });
  },

  register: async (username, password) => {
    set({ error: null });
    const user = await apiRepository.register(username, password);
    set({ user });
  },

  logout: async () => {
    await apiRepository.logout();
    set({ user: null });
    window.location.href = '/login';
  },
}));
