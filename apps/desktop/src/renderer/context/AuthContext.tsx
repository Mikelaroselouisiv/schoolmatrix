import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getMe,
  getToken,
  login as apiLogin,
  logout as apiLogout,
  type SessionUser,
} from '../services/api';

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (loginOrEmail: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    const u = await getMe();
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const u = await getMe();
        if (!cancelled) setUser(u);
      } catch {
        if (!cancelled) {
          apiLogout();
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (loginOrEmail: string, password: string, rememberMe = false) => {
    const res = await apiLogin(loginOrEmail, password, rememberMe);
    try {
      const u = await getMe();
      setUser(u ?? res.user ?? null);
    } catch {
      setUser(res.user ?? null);
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
