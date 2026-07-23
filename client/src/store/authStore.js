import { create } from 'zustand';

const TOKEN_KEY = 'satkar_auth_token';
const USER_KEY = 'satkar_auth_user';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  token: localStorage.getItem(TOKEN_KEY) || null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: false,

  login: (userData, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    set({
      user: userData,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setUser: (userData) => {
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    set({ user: userData });
  },
}));
