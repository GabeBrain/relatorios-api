import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOKEN_TTL_MS = 180 * 60 * 1000;

interface AuthState {
  token: string;
  email: string;
  issuedAt: number;
  expiresAt: number;

  setToken: (token: string, email: string) => void;
  clearToken: () => void;
  hasValidToken: () => boolean;
  getToken: () => string;
  minutesRemaining: () => number;
  expiryLabel: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: '',
      email: '',
      issuedAt: 0,
      expiresAt: 0,

      setToken: (token, email) => {
        const now = Date.now();
        set({ token, email, issuedAt: now, expiresAt: now + TOKEN_TTL_MS });
      },

      clearToken: () => set({ token: '', email: '', issuedAt: 0, expiresAt: 0 }),

      hasValidToken: () => {
        const { token, expiresAt } = get();
        return Boolean(token) && Date.now() < expiresAt;
      },

      getToken: () => {
        const { token, expiresAt } = get();
        if (Boolean(token) && Date.now() < expiresAt) return token;
        return '';
      },

      minutesRemaining: () => {
        const { expiresAt } = get();
        const ms = Math.max(0, expiresAt - Date.now());
        return Math.floor(ms / 60000);
      },

      expiryLabel: () => {
        const { expiresAt } = get();
        if (!expiresAt) return '-';
        return new Date(expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      },
    }),
    {
      name: 'brain-auth',
      partialize: (state) => ({
        token: state.token,
        email: state.email,
        issuedAt: state.issuedAt,
        expiresAt: state.expiresAt,
      }),
    }
  )
);
