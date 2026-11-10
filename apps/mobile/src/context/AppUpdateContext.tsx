import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Constants from 'expo-constants';
import type { MobileUpdateManifest } from '../config/update-feed';

type AppUpdateContextValue = {
  currentVersion: string;
  available: MobileUpdateManifest | null;
  setAvailable: (m: MobileUpdateManifest | null) => void;
  userCheckNonce: number;
  requestUserCheck: () => void;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const [available, setAvailable] = useState<MobileUpdateManifest | null>(null);
  const [userCheckNonce, setUserCheckNonce] = useState(0);
  const currentVersion = Constants.expoConfig?.version || '1.0.0';

  const requestUserCheck = useCallback(() => {
    setUserCheckNonce((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      currentVersion,
      available,
      setAvailable,
      userCheckNonce,
      requestUserCheck,
    }),
    [available, currentVersion, requestUserCheck, userCheckNonce],
  );

  return (
    <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>
  );
}

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) {
    throw new Error('useAppUpdate requires AppUpdateProvider');
  }
  return ctx;
}
