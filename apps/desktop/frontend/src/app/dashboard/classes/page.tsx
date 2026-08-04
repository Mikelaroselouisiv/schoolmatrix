"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE, fetchWithAuth } from "@/src/lib/api";
import { useSchoolProfile } from "@/src/contexts/SchoolProfileContext";
import { ExportBadgePdfButton } from "@/src/components/ExportBadgePdfButton";
import { buildBadgesPdfBlob, fetchStudentsForClassBadges } from "@/src/lib/badgeProduction";

type Room = {
  id: string;
  name: string;
  active?: boolean;
};

type ClassItem = {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
  section: string | null;
  room_id: string | null;
  room_name: string | null;
  room_count?: number;
  rooms?: Array<{ id: string; name: string; capacity: number | null }>;
  student_count?: number;
};

export default function ClassesPage() {
  const { school } = useSchoolProfile();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [section, setSection] = useState("");
  const [room_id, setRoom_id] = useState<string>("");
  const [saving, setSaving] = useState(false);


  async function load() {
    setLoading(true);
    setError("");
    try {
      const [classesRes, roomsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/classes`),
        fetchWithAuth(`${API_BASE}/rooms`),
      ]);
      const classesData = await classesRes.json();
      const roomsData = await roomsRes.json();
      if (!classesRes.ok) throw new Error(classesData.message || "Erreur");
      if (!roomsRes.ok) throw new Error(roomsData.message || "Erreur");
      setClasses(classesData.classes ?? []);
      setRooms(roomsData.rooms ?? []);
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
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        level: level.trim() || undefined,
        section: section.trim() || undefined,
        room_id: room_id || undefined,
      };
      if (editing) {
        const res = await fetchWithAuth(`${API_BASE}/classes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      } else {
        const res = await fetchWithAuth(`${API_BASE}/classes`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      }
      setShowForm(false);
      setEditing(null);
      setName("");
      setDescription("");
      setLevel("");
      setSection("");
      setRoom_id("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette classe ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/classes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openEdit(c: ClassItem) {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? "");
    setLevel(c.level ?? "");
    setSection(c.section ?? "");
    setRoom_id(c.room_id ?? "");
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setLevel("");
    setSection("");
    setRoom_id("");
    setShowForm(true);
  }

  if (loading) return <div className="animate-pulse text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Gestion des classes</h2>
        <button onClick={openCreate} className="app-btn-primary">Ajouter une classe</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-lg">
          <h3 className="font-semibold text-slate-900">{editing ? "Modifier" : "Nouvelle classe"}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optionnel" className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
              <input type="text" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="ex: 6e, 5e" className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
              <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="ex: A, B" className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            Les salles (ex. 1<sup>re</sup> année 1, 2, 3) et leur limite d’élèves se gèrent dans{" "}
            <Link href="/dashboard/rooms" className="text-[var(--school-accent-1)] hover:underline font-medium">
              Gestion des salles
            </Link>
            {editing && (editing.room_count ?? 0) > 0 && (
              <span className="block mt-1 text-slate-500">
                Salles liées :{" "}
                {(editing.rooms ?? []).map((r) => r.name).join(", ") || editing.room_count}
              </span>
            )}
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
              <th className="px-4 py-3 font-medium text-slate-900">Niveau / Section</th>
              <th className="px-4 py-3 font-medium text-slate-900">Salles</th>
              <th className="px-4 py-3 font-medium text-slate-900">Élèves</th>
              <th className="px-4 py-3 font-medium text-slate-900 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune classe</td></tr>
            ) : (
              classes.map((c) => (
                <tr key={c.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {[c.level, c.section].filter(Boolean).join(" / ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.room_count
                      ? `${c.room_count} — ${(c.rooms ?? []).map((r) => r.name).join(", ")}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.student_count ?? "-"}</td>
                  <td className="px-4 py-3 flex flex-wrap items-center gap-2">
                    <ExportBadgePdfButton
                      label="Badges"
                      filename={`badges-${c.name}`}
                      disabled={!c.student_count}
                      className="text-sm text-[var(--school-accent-1)] hover:underline border-0 bg-transparent px-0 py-0"
                      getBlob={async () => {
                        const students = await fetchStudentsForClassBadges(c.id);
                        return buildBadgesPdfBlob({ school, students });
                      }}
                    />
                    <button onClick={() => openEdit(c)} className="text-sm text-[var(--school-accent-1)] hover:underline">Modifier</button>
                    <button onClick={() => handleDelete(c.id)} className="text-sm text-red-600 hover:underline">Supprimer</button>
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
