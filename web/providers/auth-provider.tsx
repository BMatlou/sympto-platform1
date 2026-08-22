"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { authService } from "@/services/auth.service";
import type { AuthResponse } from "@/types/auth";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";

interface AuthContextValue {
  user: AuthResponse["user"] | null;
  isAuthenticated: boolean;
  isAuthLoaded: boolean;
  signIn: (data: AuthResponse) => void;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredUser(): AuthResponse["user"] | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(AUTH_USER_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as AuthResponse["user"];
  } catch {
    return null;
  }
}

function storeAuth(data: AuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
}

function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);

  const signIn = async (data: AuthResponse) => {
    storeAuth(data);
    setUser(data.user);
  };

  const signOut = async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await authService.logout();
      }
    } catch {
      // ignore logout errors
    }

    clearAuth();
    setUser(null);
    router.push("/auth/sign-in");
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      clearAuth();
      setUser(null);
      return;
    }

    const response = await authService.refresh(refreshToken);
    signIn(response);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const load = async () => {
      const storedUser = getStoredUser();
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (storedUser && accessToken) {
        setUser(storedUser);
        setIsAuthLoaded(true);
        return;
      }

      if (refreshToken) {
        try {
          const response = await authService.refresh(refreshToken);
          storeAuth(response);
          setUser(response.user);
        } catch {
          clearAuth();
          setUser(null);
        }
      }

      setIsAuthLoaded(true);
    };

    load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY || event.key === AUTH_USER_KEY) {
        const nextUser = getStoredUser();
        setUser(nextUser);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoaded,
      signIn,
      signOut,
      refreshAuth,
    }),
    [user, isAuthLoaded]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
