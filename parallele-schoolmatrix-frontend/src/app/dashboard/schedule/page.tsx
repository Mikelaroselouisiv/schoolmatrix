"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";
import { formatDateJJMMAAAA } from "@/src/lib/format";
import { DateInputJJMMAAAA } from "@/src/components/DateInputJJMMAAAA";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type ScheduleSlot = {
  id: string;
  academic_year: string | null;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  teacher_id: number;
  teacher_name: string | null;
  room_id: string | null;
  room_name: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type ExamSchedule = {
  id: string;
  class_id: string;
  class_name: string;
  subject_id: string;
  subject_name: string;
  period: string;
  exam_date: string;
  start_time: string;
  end_time: string;
};

type ExtracurricularActivity = {
  id: string;
  academic_year_id: string;
  academic_year_name: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  class_id: string;
  class_name: string;
  occasion: string;
  participation_fee: string | null;
  dress_code: string | null;
};

type ClassItem = { id: string; name: string };
type Subject = { id: string; name: string };
type Teacher = { id: number; first_name: string | null; last_name: string | null; email: string };
type Room = { id: string; name: string };
type AcademicYear = { id: string; name: string };
type Period = { id: string; name: string };

export default function SchedulePage() {
  const [tab, setTab] = useState<"cours" | "examens" | "parascolaires">("cours");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [activities, setActivities] = useState<ExtracurricularActivity[]>([]);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);

  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");

  const [defaultYearId, setDefaultYearId] = useState("");
  const [defaultYearName, setDefaultYearName] = useState("");
  const [defaultPeriodId, setDefaultPeriodId] = useState("");
  const [defaultPeriodName, setDefaultPeriodName] = useState("");

  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotForm, setSlotForm] = useState({
    academic_year: "",
    class_id: "",
    subject_id: "",
    teacher_id: "",
    room_id: "",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "09:00",
  });

  const [showExamForm, setShowExamForm] = useState(false);
  const [examForm, setExamForm] = useState({
    academic_year_id: "",
    class_id: "",
    subject_id: "",
    period: "",
    exam_date: "",
    start_time: "08:00",
    end_time: "09:00",
  });

  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    academic_year_id: "",
    activity_date: "",
    start_time: "14:00",
    end_time: "16:00",
    class_id: "",
    occasion: "",
    participation_fee: "",
    dress_code: "",
  });

  const [saving, setSaving] = useState(false);

  async function loadRefs() {
    try {
      const [cRes, sRes, tRes, rRes, ayRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/classes`),
        fetchWithAuth(`${API_BASE}/subjects`),
        fetchWithAuth(`${API_BASE}/teachers`),
        fetchWithAuth(`${API_BASE}/rooms`),
        fetchWithAuth(`${API_BASE}/academic-years`),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();
      const tData = await tRes.json();
      const rData = await rRes.json();
      const ayData = await ayRes.json();
      setClasses(cData.classes ?? []);
      setSubjects(sData.subjects ?? []);
      setTeachers(tData.teachers ?? []);
      setRooms(rData.rooms ?? []);
      setAcademicYears(ayData.academic_years ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function loadPeriods(academicYearId: string) {
    if (!academicYearId) {
      setPeriods([]);
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/periods?academic_year_id=${academicYearId}`);
      const data = await res.json();
      setPeriods(data.periods ?? []);
    } catch {
      setPeriods([]);
    }
  }

  async function loadClassSubjects(classId: string) {
    if (!classId) {
      setClassSubjects([]);
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/classes/${classId}/subjects`);
      const data = await res.json();
      setClassSubjects(data.subjects ?? []);
    } catch {
      setClassSubjects([]);
    }
  }

  async function loadSlots(overrideYearId?: string) {
    setError("");
    try {
      const params = new URLSearchParams();
      const yearId = overrideYearId ?? academicYearFilter;
      const yearName = academicYears.find((ay) => ay.id === yearId)?.name;
      if (yearName) params.set("academic_year", yearName);
      if (classFilter) params.set("class_id", classFilter);
      const res = await fetchWithAuth(`${API_BASE}/schedule-slots?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setSlots(data.schedule_slots ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function loadExams() {
    setError("");
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set("class_id", classFilter);
      const res = await fetchWithAuth(`${API_BASE}/exam-schedules?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setExams(data.exam_schedules ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function loadActivities(overrideYearId?: string) {
    setError("");
    try {
      const params = new URLSearchParams();
      const yearId = overrideYearId ?? academicYearFilter;
      if (yearId) params.set("academic_year_id", yearId);
      if (classFilter) params.set("class_id", classFilter);
      const res = await fetchWithAuth(`${API_BASE}/extracurricular-activities?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setActivities(data.extracurricular_activities ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function load() {
    setLoading(true);
    await loadRefs();
    let defaultYearId: string | undefined;
    try {
      const ctxRes = await fetchWithAuth(`${API_BASE}/school/current-context`);
      const ctxData = await ctxRes.json();
      if (ctxRes.ok && ctxData.current_academic_year_id) {
        defaultYearId = ctxData.current_academic_year_id;
        setDefaultYearId(ctxData.current_academic_year_id);
        setDefaultYearName(ctxData.current_academic_year_name ?? "");
        setDefaultPeriodId(ctxData.current_period_id ?? "");
        setDefaultPeriodName(ctxData.current_period_name ?? "");
        setAcademicYearFilter((prev) => (prev === "" ? defaultYearId! : prev));
      }
    } catch {
      /* ignore */
    }
    await Promise.all([loadSlots(defaultYearId), loadExams(), loadActivities(defaultYearId)]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadSlots();
      loadExams();
      loadActivities();
    }
  }, [academicYearFilter, classFilter]);

  useEffect(() => {
    loadPeriods(examForm.academic_year_id);
  }, [examForm.academic_year_id]);

  useEffect(() => {
    loadClassSubjects(examForm.class_id);
  }, [examForm.class_id]);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!slotForm.class_id || !slotForm.subject_id || !slotForm.teacher_id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/schedule-slots`, {
        method: "POST",
        body: JSON.stringify({
          academic_year: slotForm.academic_year || undefined,
          class_id: slotForm.class_id,
          subject_id: slotForm.subject_id,
          teacher_id: parseInt(slotForm.teacher_id, 10),
          room_id: slotForm.room_id || undefined,
          day_of_week: slotForm.day_of_week,
          start_time: slotForm.start_time,
          end_time: slotForm.end_time,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowSlotForm(false);
      setSlotForm({ academic_year: "", class_id: "", subject_id: "", teacher_id: "", room_id: "", day_of_week: 1, start_time: "08:00", end_time: "09:00" });
      loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSlot(id: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/schedule-slots/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Erreur");
      loadSlots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleAddExam(e: React.FormEvent) {
    e.preventDefault();
    if (!examForm.class_id || !examForm.subject_id || !examForm.period || !examForm.exam_date) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/exam-schedules`, {
        method: "POST",
        body: JSON.stringify(examForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowExamForm(false);
      setExamForm({ academic_year_id: "", class_id: "", subject_id: "", period: "", exam_date: "", start_time: "08:00", end_time: "09:00" });
      loadExams();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExam(id: string) {
    if (!confirm("Supprimer cet examen ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/exam-schedules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Erreur");
      loadExams();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityForm.academic_year_id || !activityForm.class_id || !activityForm.occasion || !activityForm.activity_date) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/extracurricular-activities`, {
        method: "POST",
        body: JSON.stringify({
          ...activityForm,
          participation_fee: activityForm.participation_fee || null,
          dress_code: activityForm.dress_code || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowActivityForm(false);
      setActivityForm({ academic_year_id: "", activity_date: "", start_time: "14:00", end_time: "16:00", class_id: "", occasion: "", participation_fee: "", dress_code: "" });
      loadActivities();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteActivity(id: string) {
    if (!confirm("Supprimer cette activité ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/extracurricular-activities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).message || "Erreur");
      loadActivities();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function teacherName(t: Teacher) {
    return [t.first_name, t.last_name].filter(Boolean).join(" ") || t.email;
  }

  if (loading) return <div className="animate-pulse text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Horaires</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--app-border)]">
        {(["cours", "examens", "parascolaires"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? "bg-white border border-[var(--app-border)] border-b-0 text-slate-900"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            {t === "cours" && "Horaire des cours"}
            {t === "examens" && "Horaire des examens"}
            {t === "parascolaires" && "Activités parascolaires"}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Année</label>
          <select
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
            className="text-sm border border-[var(--app-border)] rounded px-2 py-1.5"
          >
            <option value="">Toutes</option>
            {academicYears.map((ay) => (
              <option key={ay.id} value={ay.id}>{ay.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-0.5">Classe</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-sm border border-[var(--app-border)] rounded px-2 py-1.5"
          >
            <option value="">Toutes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {/* Horaire des cours */}
      {tab === "cours" && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Créneaux de cours</h3>
            <button onClick={() => { setSlotForm((f) => ({ ...f, academic_year: defaultYearName })); setShowSlotForm(true); }} className="app-btn-primary text-sm py-2">Ajouter un créneau</button>
          </div>
          {showSlotForm && (
            <form onSubmit={handleAddSlot} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-2xl">
              <h4 className="font-semibold text-slate-900">Nouveau créneau</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Année</label>
                  <select value={slotForm.academic_year} onChange={(e) => setSlotForm((f) => ({ ...f, academic_year: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm">
                    <option value="">—</option>
                    {academicYears.map((ay) => <option key={ay.id} value={ay.name}>{ay.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe *</label>
                  <select value={slotForm.class_id} onChange={(e) => setSlotForm((f) => ({ ...f, class_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matière *</label>
                  <select value={slotForm.subject_id} onChange={(e) => setSlotForm((f) => ({ ...f, subject_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Professeur *</label>
                  <select value={slotForm.teacher_id} onChange={(e) => setSlotForm((f) => ({ ...f, teacher_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{teacherName(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salle</label>
                  <select value={slotForm.room_id} onChange={(e) => setSlotForm((f) => ({ ...f, room_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm">
                    <option value="">—</option>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jour *</label>
                  <select value={slotForm.day_of_week} onChange={(e) => setSlotForm((f) => ({ ...f, day_of_week: parseInt(e.target.value, 10) }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm">
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Début *</label>
                  <input type="time" value={slotForm.start_time} onChange={(e) => setSlotForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fin *</label>
                  <input type="time" value={slotForm.end_time} onChange={(e) => setSlotForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="app-btn-primary text-sm py-2 disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button>
                <button type="button" onClick={() => setShowSlotForm(false)} className="app-btn-secondary text-sm py-2">Annuler</button>
              </div>
            </form>
          )}
          <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-900">Année</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Jour</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Horaire</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Classe</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Matière</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Professeur</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Salle</th>
                  <th className="px-4 py-2 font-medium text-slate-900 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Aucun créneau</td></tr>
                ) : (
                  slots.map((s) => (
                    <tr key={s.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-600">{s.academic_year ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{DAYS[s.day_of_week] ?? s.day_of_week}</td>
                      <td className="px-4 py-2 text-slate-600">{s.start_time} - {s.end_time}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{s.class_name}</td>
                      <td className="px-4 py-2 text-slate-700">{s.subject_name}</td>
                      <td className="px-4 py-2 text-slate-700">{s.teacher_name ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{s.room_name ?? "—"}</td>
                      <td className="px-4 py-2"><button onClick={() => handleDeleteSlot(s.id)} className="text-red-600 hover:underline text-xs">Supprimer</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Horaire des examens */}
      {tab === "examens" && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Examens</h3>
            <button onClick={() => { setExamForm((f) => ({ ...f, academic_year_id: defaultYearId, period: defaultPeriodName })); setShowExamForm(true); }} className="app-btn-primary text-sm py-2">Ajouter un examen</button>
          </div>
          {showExamForm && (
            <form onSubmit={handleAddExam} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-xl">
              <h4 className="font-semibold text-slate-900">Nouvel examen</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire *</label>
                  <select value={examForm.academic_year_id} onChange={(e) => setExamForm((f) => ({ ...f, academic_year_id: e.target.value, period: "" }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Période *</label>
                  <select value={examForm.period} onChange={(e) => setExamForm((f) => ({ ...f, period: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {periods.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe *</label>
                  <select value={examForm.class_id} onChange={(e) => setExamForm((f) => ({ ...f, class_id: e.target.value, subject_id: "" }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matière *</label>
                  <select value={examForm.subject_id} onChange={(e) => setExamForm((f) => ({ ...f, subject_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required disabled={!examForm.class_id}>
                    <option value="">{examForm.class_id ? "Sélectionner" : "Choisir une classe d'abord"}</option>
                    {classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <DateInputJJMMAAAA value={examForm.exam_date} onChange={(exam_date) => setExamForm((f) => ({ ...f, exam_date }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Début *</label>
                  <input type="time" value={examForm.start_time} onChange={(e) => setExamForm((f) => ({ ...f, start_time: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fin *</label>
                  <input type="time" value={examForm.end_time} onChange={(e) => setExamForm((f) => ({ ...f, end_time: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="app-btn-primary text-sm py-2 disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button>
                <button type="button" onClick={() => setShowExamForm(false)} className="app-btn-secondary text-sm py-2">Annuler</button>
              </div>
            </form>
          )}
          <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-900">Date</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Horaire</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Classe</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Matière</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Période</th>
                  <th className="px-4 py-2 font-medium text-slate-900 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exams.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun examen</td></tr>
                ) : (
                  exams.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-600">{formatDateJJMMAAAA(e.exam_date)}</td>
                      <td className="px-4 py-2 text-slate-600">{e.start_time} - {e.end_time}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{e.class_name}</td>
                      <td className="px-4 py-2 text-slate-700">{e.subject_name}</td>
                      <td className="px-4 py-2 text-slate-600">{e.period}</td>
                      <td className="px-4 py-2"><button onClick={() => handleDeleteExam(e.id)} className="text-red-600 hover:underline text-xs">Supprimer</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Activités parascolaires */}
      {tab === "parascolaires" && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-900">Activités parascolaires</h3>
            <button onClick={() => { setActivityForm((f) => ({ ...f, academic_year_id: defaultYearId })); setShowActivityForm(true); }} className="app-btn-primary text-sm py-2">Ajouter une activité</button>
          </div>
          {showActivityForm && (
            <form onSubmit={handleAddActivity} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-xl">
              <h4 className="font-semibold text-slate-900">Nouvelle activité</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire *</label>
                  <select value={activityForm.academic_year_id} onChange={(e) => setActivityForm((f) => ({ ...f, academic_year_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {academicYears.map((ay) => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Classe *</label>
                  <select value={activityForm.class_id} onChange={(e) => setActivityForm((f) => ({ ...f, class_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Sélectionner</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Occasion / Intitulé *</label>
                  <input type="text" value={activityForm.occasion} onChange={(e) => setActivityForm((f) => ({ ...f, occasion: e.target.value }))} placeholder="Sortie scolaire, match de foot..." className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                  <DateInputJJMMAAAA value={activityForm.activity_date} onChange={(activity_date) => setActivityForm((f) => ({ ...f, activity_date }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Horaire</label>
                  <div className="flex gap-2">
                    <input type="time" value={activityForm.start_time} onChange={(e) => setActivityForm((f) => ({ ...f, start_time: e.target.value }))} className="flex-1 border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" />
                    <input type="time" value={activityForm.end_time} onChange={(e) => setActivityForm((f) => ({ ...f, end_time: e.target.value }))} className="flex-1 border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Participation (frais)</label>
                  <input type="text" value={activityForm.participation_fee} onChange={(e) => setActivityForm((f) => ({ ...f, participation_fee: e.target.value }))} placeholder="5000 FC" className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tenue</label>
                  <input type="text" value={activityForm.dress_code} onChange={(e) => setActivityForm((f) => ({ ...f, dress_code: e.target.value }))} placeholder="Uniforme scolaire" className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="app-btn-primary text-sm py-2 disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button>
                <button type="button" onClick={() => setShowActivityForm(false)} className="app-btn-secondary text-sm py-2">Annuler</button>
              </div>
            </form>
          )}
          <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-900">Date</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Horaire</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Classe</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Occasion</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Frais</th>
                  <th className="px-4 py-2 font-medium text-slate-900">Code vestimentaire</th>
                  <th className="px-4 py-2 font-medium text-slate-900 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activities.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Aucune activité</td></tr>
                ) : (
                  activities.map((a) => (
                    <tr key={a.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-slate-600">{formatDateJJMMAAAA(a.activity_date)}</td>
                      <td className="px-4 py-2 text-slate-600">{a.start_time} - {a.end_time}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">{a.class_name}</td>
                      <td className="px-4 py-2 text-slate-700">{a.occasion}</td>
                      <td className="px-4 py-2 text-slate-600">{a.participation_fee ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-600">{a.dress_code ?? "—"}</td>
                      <td className="px-4 py-2"><button onClick={() => handleDeleteActivity(a.id)} className="text-red-600 hover:underline text-xs">Supprimer</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
