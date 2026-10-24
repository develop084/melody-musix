import { create } from 'zustand';
import { User, Role } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (accessToken: string, refreshToken: string, user: User) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  hasRole: (roles: Role | Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sdd_access_token',
  REFRESH_TOKEN: 'sdd_refresh_token',
  USER: 'sdd_user',
};

// Initial state hydrated from localStorage if present
const initialAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
const initialRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
const initialUserJson = localStorage.getItem(STORAGE_KEYS.USER);

let initialUser: User | null = null;
if (initialUserJson) {
  try {
    initialUser = JSON.parse(initialUserJson);
  } catch {
    initialUser = null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialUser,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: !!initialAccessToken && !!initialUser,
  isLoading: false,

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    set({
      accessToken,
      refreshToken,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  updateTokens: (accessToken, refreshToken) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    set({ accessToken, refreshToken });
  },

  updateUser: (user) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  hasRole: (roles) => {
    const { user } = get();
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  },

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions.includes(permission);
  },
}));
