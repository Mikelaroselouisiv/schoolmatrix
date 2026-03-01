"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";
import { useSchoolProfile } from "@/src/contexts/SchoolProfileContext";
import { ImageUpload } from "@/src/components/ImageUpload";

export default function SchoolPage() {
  const { school, refetch } = useSchoolProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [domain, setDomain] = useState("");
  const [primary_color, setPrimary_color] = useState("#0f766e");
  const [secondary_color, setSecondary_color] = useState("#0d9488");
  const [logo_url, setLogo_url] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  useEffect(() => {
    if (school) {
      setName(school.name ?? "");
      setSlogan(school.slogan ?? "");
      setDomain(school.domain ?? "");
      setPrimary_color(school.primary_color ?? "#0f766e");
      setSecondary_color(school.secondary_color ?? "#0d9488");
      setLogo_url(school.logo_url ?? null);
    }
    setLoading(false);
  }, [school]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/school/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          slogan: slogan.trim() || null,
          domain: domain.trim() || null,
          primary_color: primary_color,
          secondary_color: secondary_color,
          logo_url: logo_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse text-slate-500">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Gestion de l&apos;établissement</h2>

      <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-[var(--app-border)] bg-white space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l&apos;établissement</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="École Parallele"
            className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Slogan</label>
          <input
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Excellence et discipline"
            className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Domaine (site web)</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="https://ecole-parallele.com"
            className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Logo</label>
          <ImageUpload
            value={logo_url ?? undefined}
            onChange={(url) => setLogo_url(url || null)}
            label="Logo de l'établissement"
            token={typeof window !== "undefined" ? localStorage.getItem("token") : null}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Couleur primaire</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primary_color}
                onChange={(e) => setPrimary_color(e.target.value)}
                className="h-10 w-14 rounded border border-[var(--app-border)] cursor-pointer"
              />
              <input
                type="text"
                value={primary_color}
                onChange={(e) => setPrimary_color(e.target.value)}
                className="flex-1 border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Couleur secondaire</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={secondary_color}
                onChange={(e) => setSecondary_color(e.target.value)}
                className="h-10 w-14 rounded border border-[var(--app-border)] cursor-pointer"
              />
              <input
                type="text"
                value={secondary_color}
                onChange={(e) => setSecondary_color(e.target.value)}
                className="flex-1 border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
              />
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="app-btn-primary disabled:opacity-60">
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
