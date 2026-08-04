import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE, fetchWithAuth } from "@/services/api";
import { useSchoolProfile } from "@/context/SchoolProfileContext";
import { ExportBadgePdfButton } from "@/components/ExportBadgePdfButton";
import { buildBadgesPdfBlob, fetchStudentsForRoomBadges } from "@/lib/badgeProduction";

type Room = {
  id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  class_id: string | null;
  class_name: string | null;
  student_count: number;
  active: boolean;
};

type ClassItem = { id: string; name: string };

export function DashboardRoomsPage() {
  const { school } = useSchoolProfile();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = classFilter ? `?class_id=${encodeURIComponent(classFilter)}` : "";
      const [roomsRes, classesRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/rooms${q}`),
        fetchWithAuth(`${API_BASE}/classes`),
      ]);
      const roomsData = await roomsRes.json();
      const classesData = await classesRes.json();
      if (!roomsRes.ok) throw new Error(roomsData.message || "Erreur");
      setRooms(roomsData.rooms ?? []);
      setClasses(classesData.classes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [classFilter]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        class_id: classId,
        capacity: capacity.trim() ? parseInt(capacity.trim(), 10) : null,
      };
      if (editing) {
        const res = await fetchWithAuth(`${API_BASE}/rooms/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      } else {
        const res = await fetchWithAuth(`${API_BASE}/rooms`, {
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
      setCapacity("");
      setClassId("");
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
    setCapacity(r.capacity != null ? String(r.capacity) : "");
    setClassId(r.class_id ?? "");
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setCapacity("");
    setClassId(classFilter || "");
    setShowForm(true);
  }

  if (loading) return <div className="animate-pulse text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestion des salles</h2>
          <p className="text-sm text-slate-500 mt-1">
            Une classe (ex. 1<sup>re</sup> année) peut avoir plusieurs salles (1, 2, 3) avec une limite d’élèves.
          </p>
        </div>
        <button onClick={openCreate} className="app-btn-primary" disabled={!classes.length}>
          Ajouter une salle
        </button>
      </div>

      {!classes.length && (
        <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-sm">
          Créez d’abord une{" "}
          <Link to="/dashboard/classes" className="underline font-medium">
            classe pédagogique
          </Link>{" "}
          (ex. Première année fondamentale), puis ses salles.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Filtrer par classe</label>
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm max-w-xs"
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-lg"
        >
          <h3 className="font-semibold text-slate-900">
            {editing ? "Modifier la salle" : "Nouvelle salle"}
          </h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Classe *</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5"
              required
            >
              <option value="">Sélectionner la classe</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la salle *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: 1, 2, Première année 1"
              className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Limite d’élèves
            </label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="ex: 40 (vide = illimité)"
              className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionnel"
              className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="app-btn-primary disabled:opacity-60">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
              className="app-btn-secondary"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {error && !showForm && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-[var(--app-border)]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-900">Classe</th>
              <th className="px-4 py-3 font-medium text-slate-900">Salle</th>
              <th className="px-4 py-3 font-medium text-slate-900">Effectif</th>
              <th className="px-4 py-3 font-medium text-slate-900">Limite</th>
              <th className="px-4 py-3 font-medium text-slate-900">Statut</th>
              <th className="px-4 py-3 font-medium text-slate-900 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Aucune salle — créez par ex. « 1 », « 2 », « 3 » pour une même classe
                </td>
              </tr>
            ) : (
              rooms.map((r) => {
                const full =
                  r.capacity != null && r.student_count >= r.capacity;
                return (
                  <tr key={r.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">{r.class_name ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-4 py-3 text-slate-700">{r.student_count}</td>
                    <td className="px-4 py-3">
                      <span className={full ? "text-red-600 font-medium" : "text-slate-700"}>
                        {r.capacity != null ? r.capacity : "Illimité"}
                        {full ? " (plein)" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          r.active
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
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
                            students: students.map((s) => ({
                              ...s,
                              room_name: s.room_name || roomName,
                            })),
                          });
                        }}
                      />
                      <button
                        onClick={() => openEdit(r)}
                        className="text-sm text-[var(--school-accent-1)] hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
