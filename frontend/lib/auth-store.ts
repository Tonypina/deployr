import { create } from "zustand";
import { AuthUser } from "./types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    // Short-lived cookie so middleware can verify auth without localStorage access
    document.cookie = `mp_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    set({ user, token, isLoading: false });
  },

  clearAuth: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "mp_token=; path=/; max-age=0";
    set({ user: null, token: null, isLoading: false });
  },

  hydrate: () => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AuthUser;
        set({ user, token, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));
