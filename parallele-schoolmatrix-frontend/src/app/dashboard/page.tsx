"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSchoolProfile } from "@/src/contexts/SchoolProfileContext";
import { getImageUrl } from "@/src/lib/api";
import { getNavItemsForRole } from "@/src/lib/dashboardRoles";

export default function DashboardPage() {
  const { school, user, loading, roleName } = useSchoolProfile();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-slate-500">Chargement...</div>
      </div>
    );
  }

  const shortcuts = getNavItemsForRole(roleName);
  const logoUrl = getImageUrl(school?.logo_url ?? undefined);
  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      {/* Bloc moniteur : logo + infos établissement */}
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--app-border)] bg-white p-8 shadow-sm"
        style={{ background: "linear-gradient(180deg, var(--school-accent-1-pale, #e6f5f4) 0%, #fff 30%)" }}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-24 w-24 sm:h-32 sm:w-32 object-contain rounded-xl"
              />
            ) : (
              <div
                className="flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-xl text-4xl sm:text-5xl font-bold text-white"
                style={{ backgroundColor: "var(--school-accent-1)" }}
              >
                {school?.name?.charAt(0) ?? "É"}
              </div>
            )}
          </div>
          {/* Nom établissement */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 uppercase tracking-tight">
            {school?.name ?? "Parallele SchoolMatrix"}
          </h1>
          {school?.slogan && (
            <p className="text-slate-600 text-sm sm:text-base">{school.slogan}</p>
          )}
          {/* Message de bienvenue */}
          <p className="text-slate-700 mt-2">
            Bienvenue, <span className="font-semibold">{userName}</span>
          </p>
        </div>
      </div>

      {/* Bloc raccourcis en bas */}
      <div className="w-full max-w-4xl mt-8">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          Raccourcis
        </h2>
        <div className="flex flex-wrap justify-center gap-1.5 overflow-x-auto">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2 py-1 rounded text-xs font-medium text-slate-600 border border-[var(--app-border)] bg-white hover:border-[var(--school-accent-1)]/50 hover:bg-slate-50 transition-all whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
