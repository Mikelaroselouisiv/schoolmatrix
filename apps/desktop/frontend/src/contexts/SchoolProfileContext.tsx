"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE, getImageUrl } from "@/src/lib/api";
import { applySchoolColors } from "@/src/lib/schoolColors";

export type SchoolProfile = {
  id: string;
  name: string;
  slogan: string | null;
  domain: string | null;
  logo_url: string | null;
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

const DEFAULT_ACCENT_1 = "#0f766e";
const DEFAULT_ACCENT_2 = "#0d9488";

export function SchoolProfileProvider({
  children,
  requireAuth = false,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const [school, setSchool] = useState<SchoolProfile>(undefined as unknown as SchoolProfile);
  const [user, setUser] = useState<UserMe | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const roleName = useMemo(() => {
    const r = user?.role;
    return (typeof r === "object" ? r?.name : r) ?? "";
  }, [user]);

  const rolePermissions = useMemo(() => user?.role_permissions ?? [], [user]);

  const load = useCallback((): Promise<void> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (requireAuth && !token) {
      setLoading(false);
      setUser(null);
      return Promise.resolve();
    }
    return Promise.all([
      fetch(`${API_BASE}/school/home`).then((r) => r.json()),
      token
        ? fetch(`${API_BASE}/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.json().catch(() => ({}))
          )
        : Promise.resolve({ user: null }),
    ])
      .then(([homeData, meData]) => {
        setSchool(homeData.school ?? null);
        setUser(meData?.user ?? null);
        const primary = homeData.school?.primary_color ?? DEFAULT_ACCENT_1;
        const secondary = homeData.school?.secondary_color ?? DEFAULT_ACCENT_2;
        applySchoolColors(primary, secondary, 14);
      })
      .catch(() => {
        setSchool(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [requireAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo<SchoolProfileContextValue>(
    () => ({
      school: school ?? null,
      user: user ?? null,
      loading,
      roleName,
      rolePermissions,
      refetch: load,
    }),
    [school, user, loading, roleName, rolePermissions, load]
  );

  return (
    <SchoolProfileContext.Provider value={value}>
      {children}
    </SchoolProfileContext.Provider>
  );
}

export function useSchoolProfile() {
  const ctx = useContext(SchoolProfileContext);
  if (!ctx) throw new Error("useSchoolProfile must be used within SchoolProfileProvider");
  return ctx;
}

export function useSchoolProfileOptional() {
  return useContext(SchoolProfileContext);
}

export { getImageUrl };
