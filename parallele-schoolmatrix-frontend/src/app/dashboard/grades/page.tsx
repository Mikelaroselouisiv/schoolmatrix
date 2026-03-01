"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";

type AcademicYear = { id: string; name: string };
type ClassItem = { id: string; name: string; description?: string | null; level?: string | null; is_preschool: boolean };
type Subject = { id: string; name: string };
type Period = { id: string; name: string; order_index: number };

type FormDataRow = {
  student_id: string;
  student_name: string;
  coefficient?: number;
  grade_value?: number | null;
  detail?: string;
  grade_id?: string | null;
};
type PreschoolFormDataRow = {
  student_id: string;
  student_name: string;
  level: string | null;
  frequency: string | null;
  observation: string;
  grade_id: string | null;
};

export default function GradesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");

  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [teacher, setTeacher] = useState<{ id: number; name: string } | null>(null);
  const [defaultCoefficient, setDefaultCoefficient] = useState<number | null>(null);
  const [rows, setRows] = useState<FormDataRow[]>([]);
  const [preschoolRows, setPreschoolRows] = useState<PreschoolFormDataRow[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadAcademicYearsAndClasses() {
    setError("");
    try {
      const [yearsRes, classesRes, subjectsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/academic-years`),
        fetchWithAuth(`${API_BASE}/classes`),
        fetchWithAuth(`${API_BASE}/subjects`),
      ]);
      const yearsData = await yearsRes.json();
      const classesData = await classesRes.json();
      const subjectsData = await subjectsRes.json();
      if (!yearsRes.ok) throw new Error(yearsData.message || "Erreur années");
      if (!classesRes.ok) throw new Error(classesData.message || "Erreur classes");
      if (!subjectsRes.ok) throw new Error(subjectsData.message || "Erreur matières");
      setAcademicYears(yearsData.academic_years ?? []);
      setClasses(classesData.classes ?? []);
      setSubjects(subjectsData.subjects ?? []);
      if ((yearsData.academic_years?.length ?? 0) > 0 && !academicYearId) {
        setAcademicYearId(yearsData.academic_years[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    }
  }

  async function loadPeriods() {
    if (!academicYearId) {
      setPeriods([]);
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/periods?academic_year_id=${academicYearId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      const list = (data.periods ?? []).sort((a: Period, b: Period) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setPeriods(list);
      if (list.length > 0 && !periodId) setPeriodId(list[0].id);
    } catch {
      setPeriods([]);
    }
  }

  useEffect(() => {
    loadAcademicYearsAndClasses().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [academicYearId]);

  useEffect(() => {
    setSelectedClass(classes.find((c) => c.id === classId) ?? null);
  }, [classId, classes]);

  useEffect(() => {
    if (!academicYearId || !classId || !subjectId || !periodId) {
      setTeacher(null);
      setDefaultCoefficient(null);
      setRows([]);
      setPreschoolRows([]);
      return;
    }
    const isPreschool = selectedClass?.is_preschool ?? false;
    setFormLoading(true);
    setError("");
    const url = isPreschool
      ? `${API_BASE}/grades/preschool/form-data?academic_year_id=${academicYearId}&class_id=${classId}&subject_id=${subjectId}&period_id=${periodId}`
      : `${API_BASE}/grades/form-data?academic_year_id=${academicYearId}&class_id=${classId}&subject_id=${subjectId}&period_id=${periodId}`;
    fetchWithAuth(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.message && !data.teacher && !data.rows) throw new Error(data.message);
        setTeacher(data.teacher ?? null);
        if (!isPreschool) {
          setDefaultCoefficient(data.default_coefficient ?? null);
          setRows(data.rows ?? []);
          setPreschoolRows([]);
        } else {
          setDefaultCoefficient(null);
          setRows([]);
          setPreschoolRows(data.rows ?? []);
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Erreur");
        setRows([]);
        setPreschoolRows([]);
      })
      .finally(() => setFormLoading(false));
  }, [academicYearId, classId, subjectId, periodId, selectedClass?.is_preschool]);

  async function handleSaveGrades(e: React.FormEvent) {
    e.preventDefault();
    if (!academicYearId || !classId || !subjectId || !periodId) return;
    const isPreschool = selectedClass?.is_preschool ?? false;
    setSaving(true);
    setError("");
    try {
      const url = isPreschool ? `${API_BASE}/grades/preschool/save` : `${API_BASE}/grades/save`;
      const body = isPreschool
        ? {
            academic_year_id: academicYearId,
            class_id: classId,
            subject_id: subjectId,
            period_id: periodId,
            grades: preschoolRows.map((r) => ({
              student_id: r.student_id,
              level: r.level?.trim() || undefined,
              frequency: r.frequency?.trim() || undefined,
              observation: r.observation?.trim() || undefined,
            })),
          }
        : {
            academic_year_id: academicYearId,
            class_id: classId,
            subject_id: subjectId,
            period_id: periodId,
            grades: rows.map((r) => ({
              student_id: r.student_id,
              coefficient: r.coefficient ?? defaultCoefficient ?? 0,
              grade_value: r.grade_value,
              detail: r.detail?.trim() || undefined,
            })),
          };
      const res = await fetchWithAuth(url, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur enregistrement");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const isPreschool = selectedClass?.is_preschool ?? false;
  const canLoadForm = academicYearId && classId && subjectId && periodId;
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? "";
  const periodName = periods.find((p) => p.id === periodId)?.name ?? "";

  if (loading) {
    return <div className="animate-pulse text-slate-500">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Saisie des notes</h2>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      <div className="p-5 rounded-xl border border-[var(--app-border)] bg-white">
        <h3 className="font-semibold text-slate-900 mb-4">Sélection</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire</label>
            <select
              value={academicYearId}
              onChange={(e) => { setAcademicYearId(e.target.value); setPeriodId(""); }}
              className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
            >
              <option value="">Sélectionner</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
            >
              <option value="">Sélectionner</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.is_preschool ? " (préscolaire)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
            >
              <option value="">Sélectionner</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Période</label>
            <select
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
            >
              <option value="">Sélectionner</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {canLoadForm && (
        <>
          {formLoading ? (
            <div className="p-8 text-center text-slate-500">Chargement des élèves et des notes...</div>
          ) : (
            <form onSubmit={handleSaveGrades} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  {subjectName} — {periodName}
                  {teacher && <span className="ml-2">(Enseignant : {teacher.name})</span>}
                  {isPreschool && <span className="ml-2 font-medium text-amber-700">— Évaluation préscolaire</span>}
                </p>
                <button type="submit" disabled={saving} className="app-btn-primary disabled:opacity-60">
                  {saving ? "Enregistrement..." : "Enregistrer les notes"}
                </button>
              </div>

              {isPreschool ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                      <tr>
                        <th className="px-4 py-3 font-medium text-slate-900">Élève</th>
                        <th className="px-4 py-3 font-medium text-slate-900 w-32">Niveau</th>
                        <th className="px-4 py-3 font-medium text-slate-900 w-32">Fréquence</th>
                        <th className="px-4 py-3 font-medium text-slate-900">Observation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preschoolRows.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun élève dans cette classe</td></tr>
                      ) : (
                        preschoolRows.map((r) => (
                          <tr key={r.student_id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">{r.student_name}</td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={r.level ?? ""}
                                onChange={(e) => setPreschoolRows((prev) => prev.map((row) => row.student_id === r.student_id ? { ...row, level: e.target.value || null } : row))}
                                placeholder="Ex: A, EA, NA"
                                className="w-full border border-[var(--app-border)] rounded px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={r.frequency ?? ""}
                                onChange={(e) => setPreschoolRows((prev) => prev.map((row) => row.student_id === r.student_id ? { ...row, frequency: e.target.value || null } : row))}
                                placeholder="Ex: Régulier"
                                className="w-full border border-[var(--app-border)] rounded px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={r.observation}
                                onChange={(e) => setPreschoolRows((prev) => prev.map((row) => row.student_id === r.student_id ? { ...row, observation: e.target.value } : row))}
                                placeholder="Observation"
                                className="w-full border border-[var(--app-border)] rounded px-2 py-1.5 text-sm"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                      <tr>
                        <th className="px-4 py-3 font-medium text-slate-900">Élève</th>
                        <th className="px-4 py-3 font-medium text-slate-900 w-24">Coef.</th>
                        <th className="px-4 py-3 font-medium text-slate-900 w-28">Note</th>
                        <th className="px-4 py-3 font-medium text-slate-900">Détail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun élève dans cette classe</td></tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={r.student_id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">{r.student_name}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={r.coefficient ?? defaultCoefficient ?? ""}
                                onChange={(e) => setRows((prev) => prev.map((row) => row.student_id === r.student_id ? { ...row, coefficient: parseFloat(e.target.value) || 0 } : row))}
                                className="w-full border border-[var(--app-border)] rounded px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="20"
                                value={r.grade_value ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setRows((prev) => prev.map((row) => row.student_id === r.student_id ? { ...row, grade_value: v === "" ? null : parseFloat(v) } : row));
                                }}
                                placeholder="0–20"
                                className="w-full border border-[var(--app-border)] rounded px-2 py-1.5 text-sm"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={r.detail ?? ""}
                                onChange={(e) => setRows((prev) => prev.map((row) => row.student_id === r.student_id ? { ...row, detail: e.target.value } : row))}
                                placeholder="Optionnel"
                                className="w-full border border-[var(--app-border)] rounded px-2 py-1.5 text-sm"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </form>
          )}
        </>
      )}

      {!canLoadForm && !formLoading && (
        <p className="text-slate-500 text-sm">Sélectionnez une année, une classe, une matière et une période pour afficher le tableau de saisie.</p>
      )}
    </div>
  );
}
