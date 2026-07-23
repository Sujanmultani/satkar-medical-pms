import { create } from 'zustand';

const TOKEN_KEY = 'satkar_auth_token';
const USER_KEY = 'satkar_auth_user';

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || raw === 'undefined') return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error parsing stored user from localStorage:', err);
    return null;
  }
};

const getInitialToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && token !== 'undefined' ? token : null;
  } catch (err) {
    return null;
  }
};

const token = getInitialToken();
const user = getInitialUser();

export const useAuthStore = create((set) => ({
  user,
  token,
  isAuthenticated: !!token,
  isLoading: false,

  login: (userData, tokenVal) => {
    try {
      localStorage.setItem(TOKEN_KEY, tokenVal);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (e) {}
    set({
      user: userData,
      token: tokenVal,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {}
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setUser: (userData) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (e) {}
    set({ user: userData });
  },
}));
