"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSchoolProfileOptional } from "@/src/contexts/SchoolProfileContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useSchoolProfileOptional();
  const router = useRouter();

  useEffect(() => {
    if (!ctx?.loading && !ctx?.user) {
      router.replace("/login");
    }
  }, [ctx?.loading, ctx?.user, router]);

  if (ctx?.loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-500">Chargement...</div>
      </div>
    );
  }

  if (!ctx?.user) {
    return null;
  }

  return <>{children}</>;
}
