"use client";

import { useState, useEffect } from "react";
import { API_BASE, fetchWithAuth } from "@/src/lib/api";
import { useSchoolProfile } from "@/src/contexts/SchoolProfileContext";
import { ExportBadgePdfButton } from "@/src/components/ExportBadgePdfButton";
import { buildBadgesPdfBlob, fetchStudentsForRoomBadges } from "@/src/lib/badgeProduction";

type Room = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export default function RoomsPage() {
  const { school } = useSchoolProfile();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/rooms`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setRooms(data.rooms ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        const res = await fetchWithAuth(`${API_BASE}/rooms/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      } else {
        const res = await fetchWithAuth(`${API_BASE}/rooms`, {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      }
      setShowForm(false);
      setEditing(null);
      setName("");
      setDescription("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette salle ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openEdit(r: Room) {
    setEditing(r);
    setName(r.name);
    setDescription(r.description ?? "");
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setShowForm(true);
  }

  if (loading) return <div className="animate-pulse text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Gestion des salles</h2>
        <button onClick={openCreate} className="app-btn-primary">Ajouter une salle</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-lg">
          <h3 className="font-semibold text-slate-900">{editing ? "Modifier" : "Nouvelle salle"}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Salle 101, Labo sciences" className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel" className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="app-btn-primary disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="app-btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {error && !showForm && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-[var(--app-border)]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-900">Nom</th>
              <th className="px-4 py-3 font-medium text-slate-900">Description</th>
              <th className="px-4 py-3 font-medium text-slate-900">Statut</th>
              <th className="px-4 py-3 font-medium text-slate-900 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucune salle — créez-en une pour l’associer aux classes et horaires</td></tr>
            ) : (
              rooms.map((r) => (
                <tr key={r.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.description ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${r.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                      {r.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                    <ExportBadgePdfButton
                      label="Badges"
                      filename={`badges-salle-${r.name}`}
                      className="text-sm text-[var(--school-accent-1)] hover:underline border-0 bg-transparent px-0 py-0"
                      getBlob={async () => {
                        const { students, roomName } = await fetchStudentsForRoomBadges(r.id);
                        return buildBadgesPdfBlob({
                          school,
                          students: students.map((s) => ({ ...s, room_name: s.room_name || roomName })),
                        });
                      }}
                    />
                    <button onClick={() => openEdit(r)} className="text-sm text-[var(--school-accent-1)] hover:underline">Modifier</button>
                    <button onClick={() => handleDelete(r.id)} className="text-sm text-red-600 hover:underline">Supprimer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
