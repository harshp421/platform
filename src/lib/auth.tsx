// Auth context — holds the current platform-admin session and persists it across
// reloads. The backend issues a JWT (spec §8); we cache it plus the returned user
// so the shell can render without a round-trip on every refresh.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, setToken } from './api.ts';
import type { User } from './types.ts';

const USER_KEY = 'canopy.platform.user';

function loadUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser);

  const persist = useCallback((u: User, token: string) => {
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login({ email, password });
      assertPlatform(res.user.role);
      persist(res.user, res.token);
    },
    [persist],
  );

  // No register(): platform admins are provisioned via the backend seed
  // (`npm run seed`), never self-registered through this UI.

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, isAuthenticated: user !== null, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function assertPlatform(role: string): void {
  if (role !== 'platform') {
    throw new Error('This account is not a platform account. Use the matching panel for your role.');
  }
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
