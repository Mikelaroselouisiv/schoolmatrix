"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";
import Link from "next/link";

type Teacher = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  active: boolean;
};

type TeacherDetail = Teacher & {
  classes: { id: string; class_id: string; class_name: string; is_main: boolean }[];
  subjects: { id: string; subject_id: string; subject_name: string }[];
};

type ClassItem = { id: string; name: string };
type Subject = { id: string; name: string };
type User = { id: number; first_name: string | null; last_name: string | null; email: string; role: string | null };

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPromoteForm, setShowPromoteForm] = useState(false);
  const [promoteUserId, setPromoteUserId] = useState("");
  const [promoting, setPromoting] = useState(false);

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState("");
  const [addingClass, setAddingClass] = useState(false);
  const [newClassId, setNewClassId] = useState("");
  const [saving, setSaving] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  async function loadTeachers() {
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/teachers`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setTeachers(data.teachers ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function loadTeacherDetail(id: number) {
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/teachers/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setSelectedTeacher(data.teacher);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSelectedTeacher(null);
    }
  }

  async function loadRefs() {
    setError("");
    try {
      const [classesRes, subjectsRes, usersRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/classes`),
        fetchWithAuth(`${API_BASE}/subjects`),
        fetchWithAuth(`${API_BASE}/users`),
      ]);
      const classesData = await classesRes.json();
      const subjectsData = await subjectsRes.json();
      const usersData = await usersRes.json();
      if (!classesRes.ok) throw new Error(classesData.message || "Erreur");
      if (!subjectsRes.ok) throw new Error(subjectsData.message || "Erreur");
      if (!usersRes.ok) throw new Error(usersData.message || "Erreur");
      setClasses(classesData.classes ?? []);
      setSubjects(subjectsData.subjects ?? []);
      setUsers(usersData.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function load() {
    setLoading(true);
    await Promise.all([loadTeachers(), loadRefs()]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedTeacher?.id) loadTeacherDetail(selectedTeacher.id);
  }, [selectedTeacher?.id]);

  const nonTeachers = users.filter((u) => u.role !== "TEACHER");

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promoteUserId) return;
    setPromoting(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${promoteUserId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ roleName: "TEACHER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowPromoteForm(false);
      setPromoteUserId("");
      await loadTeachers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPromoting(false);
    }
  }

  async function handleAddSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacher || !newSubjectId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/teachers/${selectedTeacher.id}/subjects`, {
        method: "POST",
        body: JSON.stringify({ subject_id: newSubjectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setAddingSubject(false);
      setNewSubjectId("");
      await loadTeacherDetail(selectedTeacher.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSubject(subjectId: string) {
    if (!selectedTeacher || !confirm("Retirer cette matière ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/teachers/${selectedTeacher.id}/subjects/${subjectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      await loadTeacherDetail(selectedTeacher.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacher || !newClassId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/teachers/${selectedTeacher.id}/classes`, {
        method: "POST",
        body: JSON.stringify({ class_id: newClassId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setAddingClass(false);
      setNewClassId("");
      await loadTeacherDetail(selectedTeacher.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveClass(classId: string) {
    if (!selectedTeacher || !confirm("Retirer cette classe ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/teachers/${selectedTeacher.id}/classes/${classId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      await loadTeacherDetail(selectedTeacher.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  const teacherSubjects = selectedTeacher?.subjects ?? [];
  const teacherClasses = selectedTeacher?.classes ?? [];
  const availableSubjects = subjects.filter((s) => !teacherSubjects.some((ts) => ts.subject_id === s.id));
  const availableClasses = classes.filter((c) => !teacherClasses.some((tc) => tc.class_id === c.id));

  function teacherName(t: Teacher) {
    return [t.first_name, t.last_name].filter(Boolean).join(" ") || t.email;
  }

  if (loading) return <div className="animate-pulse text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Professeurs</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowPromoteForm(true)} className="app-btn-primary text-sm py-2">
            Ajouter un professeur
          </button>
          <Link href="/dashboard/users" className="app-btn-secondary text-sm py-2">
            Gérer les utilisateurs
          </Link>
        </div>
      </div>

      <p className="text-slate-600 text-sm">
        Un professeur est un utilisateur avec le rôle TEACHER. Assignez des matières et des classes à chaque professeur. L&apos;horaire précis sera défini plus tard.
      </p>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {/* Promouvoir utilisateur en professeur */}
      {showPromoteForm && (
        <form onSubmit={handlePromote} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-md">
          <h3 className="font-semibold text-slate-900">Promouvoir en professeur</h3>
          <p className="text-sm text-slate-600">Choisissez un utilisateur existant pour lui attribuer le rôle de professeur.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Utilisateur</label>
            <select
              value={promoteUserId}
              onChange={(e) => setPromoteUserId(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
              required
            >
              <option value="">Sélectionner...</option>
              {nonTeachers.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || u.email} ({u.email})
                </option>
              ))}
            </select>
          </div>
          {nonTeachers.length === 0 && (
            <p className="text-sm text-amber-600">Aucun utilisateur disponible. Créez d&apos;abord un utilisateur dans Gestion Utilisateurs.</p>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={promoting || nonTeachers.length === 0} className="app-btn-primary disabled:opacity-60 text-sm py-2">
              {promoting ? "En cours..." : "Promouvoir"}
            </button>
            <button type="button" onClick={() => { setShowPromoteForm(false); setPromoteUserId(""); }} className="app-btn-secondary text-sm py-2">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Liste des professeurs */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Liste des professeurs</h3>
          <div className="rounded-xl border border-[var(--app-border)] overflow-hidden">
            {teachers.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">Aucun professeur</div>
            ) : (
              teachers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTeacher({ ...t, classes: [], subjects: [] })}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--app-border)] last:border-b-0 hover:bg-slate-50 transition-colors ${selectedTeacher?.id === t.id ? "bg-slate-50 border-l-4 border-l-[var(--school-accent-1)]" : ""}`}
                >
                  <div className="font-medium text-slate-900">{teacherName(t)}</div>
                  <div className="text-sm text-slate-500">{t.email}</div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Détail : matières et classes */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            {selectedTeacher ? `Assignations : ${teacherName(selectedTeacher)}` : "Sélectionnez un professeur"}
          </h3>

          {selectedTeacher && (
            <>
              {/* Matières enseignées */}
              <div className="rounded-xl border border-[var(--app-border)] bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Matières enseignées</h4>
                  {!addingSubject && availableSubjects.length > 0 && (
                    <button onClick={() => setAddingSubject(true)} className="text-sm text-[var(--school-accent-1)] hover:underline">
                      + Ajouter
                    </button>
                  )}
                </div>
                {addingSubject && (
                  <form onSubmit={handleAddSubject} className="flex gap-2 mb-3">
                    <select
                      value={newSubjectId}
                      onChange={(e) => setNewSubjectId(e.target.value)}
                      className="flex-1 border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
                    >
                      <option value="">Choisir une matière...</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button type="submit" disabled={saving || !newSubjectId} className="app-btn-primary text-sm py-2 disabled:opacity-60">
                      OK
                    </button>
                    <button type="button" onClick={() => { setAddingSubject(false); setNewSubjectId(""); }} className="app-btn-secondary text-sm py-2">Annuler</button>
                  </form>
                )}
                <ul className="space-y-1">
                  {teacherSubjects.length === 0 ? (
                    <li className="text-sm text-slate-500">Aucune matière assignée</li>
                  ) : (
                    teacherSubjects.map((s) => (
                      <li key={s.id} className="flex items-center justify-between py-1">
                        <span className="text-slate-700">{s.subject_name}</span>
                        <button onClick={() => handleRemoveSubject(s.subject_id)} className="text-xs text-red-600 hover:underline">Retirer</button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Classes */}
              <div className="rounded-xl border border-[var(--app-border)] bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">Classes</h4>
                  {!addingClass && availableClasses.length > 0 && (
                    <button onClick={() => setAddingClass(true)} className="text-sm text-[var(--school-accent-1)] hover:underline">
                      + Ajouter
                    </button>
                  )}
                </div>
                {addingClass && (
                  <form onSubmit={handleAddClass} className="flex gap-2 mb-3">
                    <select
                      value={newClassId}
                      onChange={(e) => setNewClassId(e.target.value)}
                      className="flex-1 border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40"
                    >
                      <option value="">Choisir une classe...</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button type="submit" disabled={saving || !newClassId} className="app-btn-primary text-sm py-2 disabled:opacity-60">
                      OK
                    </button>
                    <button type="button" onClick={() => { setAddingClass(false); setNewClassId(""); }} className="app-btn-secondary text-sm py-2">Annuler</button>
                  </form>
                )}
                <ul className="space-y-1">
                  {teacherClasses.length === 0 ? (
                    <li className="text-sm text-slate-500">Aucune classe assignée</li>
                  ) : (
                    teacherClasses.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-1">
                        <span className="text-slate-700">{c.class_name}{c.is_main ? " (principale)" : ""}</span>
                        <button onClick={() => handleRemoveClass(c.class_id)} className="text-xs text-red-600 hover:underline">Retirer</button>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <p className="text-xs text-slate-500">
                Ce professeur peut enseigner {teacherSubjects.length} matière(s) dans {teacherClasses.length} classe(s). L&apos;horaire précis (jour, heure) sera défini dans Horaires.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
