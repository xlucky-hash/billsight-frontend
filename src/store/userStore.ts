import { create } from 'zustand';
import type { UserInfo } from '@/types/auth';
import {
  clearAuth,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/utils/auth';

interface UserState {
  token: string | null;
  user: UserInfo | null;
  isLoggedIn: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  token: getToken(),
  user: getStoredUser(),
  isLoggedIn: Boolean(getToken()),
  login: (token, user) => {
    setToken(token);
    setStoredUser(user);
    set({ token, user, isLoggedIn: true });
  },
  logout: () => {
    clearAuth();
    set({ token: null, user: null, isLoggedIn: false });
  },
}));
