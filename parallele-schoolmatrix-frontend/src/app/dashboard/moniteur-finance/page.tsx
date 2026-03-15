"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type Activity = { id: string; name: string; code: string | null };
type MonitorStats = {
  total_entrees: number;
  total_sorties: number;
  solde: number;
  detail_entrees_economat: number;
  detail_entrees_autres: number;
  detail_sorties: number;
};

export default function MoniteurFinancePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    setDateFrom(`${y}-${m}-01`);
    setDateTo(d.toISOString().slice(0, 10));
  }, []);

  async function loadActivities() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/activities`);
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch {
      setActivities([]);
    }
  }

  async function loadStats() {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      if (selectedActivity) params.set("fee_service_id", selectedActivity);
      const res = await fetchWithAuth(`${API_BASE}/finance/monitor?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setStats({
        total_entrees: data.total_entrees ?? 0,
        total_sorties: data.total_sorties ?? 0,
        solde: data.solde ?? 0,
        detail_entrees_economat: data.detail_entrees_economat ?? 0,
        detail_entrees_autres: data.detail_entrees_autres ?? 0,
        detail_sorties: data.detail_sorties ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateFrom, dateTo, selectedActivity]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Moniteur Finance</h2>


      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Du</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Au</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-700">Activité</label>
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">Vue globale</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-slate-500 py-8">Chargement...</div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-[var(--app-border)] bg-white">
            <p className="text-sm text-slate-600 mb-1">Total entrées</p>
            <p className="text-2xl font-bold text-green-700">{stats.total_entrees.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-slate-500 mt-2">Dont économat: {stats.detail_entrees_economat.toLocaleString("fr-FR")} · Autres: {stats.detail_entrees_autres.toLocaleString("fr-FR")}</p>
          </div>
          <div className="p-5 rounded-xl border border-[var(--app-border)] bg-white">
            <p className="text-sm text-slate-600 mb-1">Total sorties</p>
            <p className="text-2xl font-bold text-red-700">{stats.detail_sorties.toLocaleString("fr-FR")}</p>
          </div>
          <div className="p-5 rounded-xl border border-[var(--app-border)] bg-white">
            <p className="text-sm text-slate-600 mb-1">Solde (entrées − sorties)</p>
            <p className={`text-2xl font-bold ${stats.solde >= 0 ? "text-green-700" : "text-red-700"}`}>{stats.solde.toLocaleString("fr-FR")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
