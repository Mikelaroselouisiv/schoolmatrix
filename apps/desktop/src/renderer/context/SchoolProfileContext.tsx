import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { API_BASE, fetchWithAuth, getImageUrl, getToken, initApi } from '../services/api';
import { applySchoolColors } from '../lib/schoolColors';

export type SchoolProfile = {
  id: string;
  name: string;
  slogan: string | null;
  domain: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  primary_color: string;
  secondary_color: string;
  active: boolean;
} | null;

type UserMe = {
  id?: number;
  userId?: number;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string | null;
  role?: { name: string } | string;
  role_permissions?: string[];
};

type SchoolProfileContextValue = {
  school: SchoolProfile;
  user: UserMe | null;
  loading: boolean;
  roleName: string;
  rolePermissions: string[];
  refetch: () => Promise<void>;
};

const SchoolProfileContext = createContext<SchoolProfileContextValue | null>(null);

const DEFAULT_ACCENT_1 = '#0f766e';
const DEFAULT_ACCENT_2 = '#0d9488';

export function SchoolProfileProvider({
  children,
  requireAuth = false,
}: {
  children: ReactNode;
  requireAuth?: boolean;
}) {
  const [school, setSchool] = useState<SchoolProfile>(null);
  const [user, setUser] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);

  const roleName = useMemo(() => {
    const r = user?.role;
    return (typeof r === 'object' ? r?.name : r) ?? '';
  }, [user]);

  const rolePermissions = useMemo(() => user?.role_permissions ?? [], [user]);

  const load = useCallback(async (): Promise<void> => {
    await initApi();
    const token = getToken();
    if (requireAuth && !token) {
      setLoading(false);
      setUser(null);
      return;
    }
    try {
      const [homeRes, meRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/school/home`),
        token ? fetchWithAuth(`${API_BASE}/users/me`) : Promise.resolve(null),
      ]);
      const homeData = await homeRes.json();
      const meData = meRes ? await meRes.json().catch(() => ({})) : { user: null };
      setSchool(homeData.school ?? null);
      setUser(meData?.user ?? null);
      const primary = homeData.school?.primary_color ?? DEFAULT_ACCENT_1;
      const secondary = homeData.school?.secondary_color ?? DEFAULT_ACCENT_2;
      applySchoolColors(primary, secondary, 14);
    } catch {
      setSchool(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<SchoolProfileContextValue>(
    () => ({
      school,
      user,
      loading,
      roleName,
      rolePermissions,
      refetch: load,
    }),
    [school, user, loading, roleName, rolePermissions, load],
  );

  return (
    <SchoolProfileContext.Provider value={value}>{children}</SchoolProfileContext.Provider>
  );
}

export function useSchoolProfile() {
  const ctx = useContext(SchoolProfileContext);
  if (!ctx) throw new Error('useSchoolProfile must be used within SchoolProfileProvider');
  return ctx;
}

export function useSchoolProfileOptional() {
  return useContext(SchoolProfileContext);
}

export { getImageUrl };
