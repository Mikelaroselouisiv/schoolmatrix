"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";
import { useSchoolProfile } from "@/src/contexts/SchoolProfileContext";
import { ROLES_FULL } from "@/src/lib/dashboardRoles";
import { formatDateJJMMAAAA, getTodayLocalYYYYMMDD } from "@/src/lib/format";
import { DateInputJJMMAAAA } from "@/src/components/DateInputJJMMAAAA";

const ROLES_SERVICES_ET_EXONERATIONS = ROLES_FULL; // DIRECTEUR_GENERAL, SCHOOL_ADMIN, SUPER_ADMIN

type AcademicYear = { id: string; name: string };
type ClassItem = { id: string; name: string };
type Student = { id: string; order_number: string | null; first_name: string; last_name: string; class_id: string; class_name: string };
type FeeService = { id: string; name: string; code: string | null };
type ClassFee = {
  id: string;
  academic_year: string;
  class_id: string;
  class_name: string;
  service_id: string;
  service_name: string;
  amount: number;
  detail: string | null;
  created_at: string;
};
type Transaction = {
  id: string;
  student_id: string;
  student_name: string | null;
  class_name: string | null;
  academic_year: string;
  service_name: string | null;
  amount_due: number;
  amount_paid: number;
  payment_date: string;
  created_at: string;
};
type Exemption = {
  id: string;
  student_id: string;
  student_name: string | null;
  academic_year: string;
  service_id: string;
  service_name: string | null;
  exemption_type: string;
  created_at: string;
};

export default function EconomatPage() {
  const { roleName } = useSchoolProfile() ?? { roleName: "" };
  const canSeeServicesAndExemptions = ROLES_SERVICES_ET_EXONERATIONS.includes(roleName);

  const [tab, setTab] = useState<"paiements" | "services" | "exonerations">("paiements");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeServices, setFeeServices] = useState<FeeService[]>([]);
  const [currentYearLabel, setCurrentYearLabel] = useState<string>("");

  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exemptions, setExemptions] = useState<Exemption[]>([]);

  const [paymentForm, setPaymentForm] = useState({
    student_id: "",
    class_id: "",
    academic_year: "",
    service_id: "",
    amount_paid: "",
    payment_date: getTodayLocalYYYYMMDD(),
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const [showClassFeeForm, setShowClassFeeForm] = useState(false);
  const [classFeeForm, setClassFeeForm] = useState({
    academic_year: "",
    class_id: "",
    service_id: "",
    amount: "",
    detail: "",
  });
  const [editingClassFee, setEditingClassFee] = useState<ClassFee | null>(null);
  const [savingClassFee, setSavingClassFee] = useState(false);

  const [showExemptionForm, setShowExemptionForm] = useState(false);
  const [exemptionForm, setExemptionForm] = useState({
    student_id: "",
    academic_year: "",
    service_id: "",
    exemption_type: "FULL",
  });
  const [savingExemption, setSavingExemption] = useState(false);
  const [exemptionFilterYear, setExemptionFilterYear] = useState("");

  async function loadBaseData() {
    setError("");
    try {
      const [yearsRes, classesRes, servicesRes, currentRes, ctxRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/academic-years`),
        fetchWithAuth(`${API_BASE}/classes`),
        fetchWithAuth(`${API_BASE}/economat/fee-services`),
        fetchWithAuth(`${API_BASE}/economat/current-year`),
        fetchWithAuth(`${API_BASE}/school/current-context`),
      ]);
      const yearsData = await yearsRes.json();
      const classesData = await classesRes.json();
      const servicesData = await servicesRes.json();
      const currentData = await currentRes.json();
      const ctxData = await ctxRes.json();
      if (!yearsRes.ok) throw new Error(yearsData.message || "Erreur années");
      if (!classesRes.ok) throw new Error(classesData.message || "Erreur classes");
      if (!servicesRes.ok) throw new Error(servicesData.message || "Erreur services");
      setAcademicYears(yearsData.academic_years ?? []);
      setClasses(classesData.classes ?? []);
      setFeeServices(servicesData.fee_services ?? []);
      const defaultYearName = ctxRes.ok && ctxData.current_academic_year_name
        ? ctxData.current_academic_year_name
        : (currentData.academic_year as string) || "";
      setCurrentYearLabel(defaultYearName);
      setFilterYear((prev) => (prev === "" && defaultYearName ? defaultYearName : prev));
      setExemptionFilterYear((prev) => (prev === "" && defaultYearName ? defaultYearName : prev));
      if (defaultYearName) {
        setPaymentForm((prev) => (prev.academic_year ? prev : { ...prev, academic_year: defaultYearName }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    }
  }

  async function loadStudents(classId?: string) {
    if (!classId) {
      setStudents([]);
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/students?class_id=${classId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setStudents(data.students ?? []);
    } catch {
      setStudents([]);
    }
  }

  async function loadTransactions() {
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("academic_year", filterYear);
      if (filterClass) params.set("class_id", filterClass);
      const res = await fetchWithAuth(`${API_BASE}/economat/transactions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setTransactions(data.transactions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function loadClassFees() {
    setError("");
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set("academic_year", filterYear);
      if (filterClass) params.set("class_id", filterClass);
      const res = await fetchWithAuth(`${API_BASE}/economat/class-fees?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setClassFees(data.class_fees ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function loadExemptions() {
    setError("");
    try {
      const params = new URLSearchParams();
      if (exemptionFilterYear) params.set("academic_year", exemptionFilterYear);
      const res = await fetchWithAuth(`${API_BASE}/economat/exemptions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setExemptions(data.exemptions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  useEffect(() => {
    loadBaseData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "paiements") loadTransactions();
    if (tab === "services" && canSeeServicesAndExemptions) loadClassFees();
    if (tab === "exonerations" && canSeeServicesAndExemptions) loadExemptions();
  }, [tab, filterYear, filterClass, exemptionFilterYear, canSeeServicesAndExemptions]);

  useEffect(() => {
    if (paymentForm.class_id) loadStudents(paymentForm.class_id);
    else setStudents([]);
  }, [paymentForm.class_id]);

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.student_id || !paymentForm.class_id || !paymentForm.academic_year || !paymentForm.service_id || !paymentForm.amount_paid || !paymentForm.payment_date) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    const amount = parseFloat(paymentForm.amount_paid);
    if (isNaN(amount) || amount <= 0) {
      setError("Montant invalide.");
      return;
    }
    setSavingPayment(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/economat/payments`, {
        method: "POST",
        body: JSON.stringify({
          student_id: paymentForm.student_id,
          class_id: paymentForm.class_id,
          academic_year: paymentForm.academic_year,
          service_id: paymentForm.service_id,
          amount_paid: amount,
          payment_date: paymentForm.payment_date,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setPaymentForm((f) => ({ ...f, amount_paid: "", student_id: "" }));
      loadTransactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleSaveClassFee(e: React.FormEvent) {
    e.preventDefault();
    const year = editingClassFee ? undefined : classFeeForm.academic_year;
    const classId = editingClassFee ? undefined : classFeeForm.class_id;
    const serviceId = editingClassFee ? undefined : classFeeForm.service_id;
    if (!editingClassFee && (!year || !classId || !serviceId)) {
      setError("Année, classe et service requis.");
      return;
    }
    const amount = editingClassFee ? editingClassFee.amount : parseFloat(classFeeForm.amount);
    if (isNaN(amount) || amount < 0) {
      setError("Montant invalide.");
      return;
    }
    setSavingClassFee(true);
    setError("");
    try {
      if (editingClassFee) {
        const res = await fetchWithAuth(`${API_BASE}/economat/class-fees/${editingClassFee.id}`, {
          method: "PATCH",
          body: JSON.stringify({ amount, detail: classFeeForm.detail.trim() || undefined }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      } else {
        const res = await fetchWithAuth(`${API_BASE}/economat/class-fees`, {
          method: "POST",
          body: JSON.stringify({
            academic_year: year,
            class_id: classId,
            service_id: serviceId,
            amount,
            detail: classFeeForm.detail.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      }
      setShowClassFeeForm(false);
      setEditingClassFee(null);
      setClassFeeForm({ academic_year: "", class_id: "", service_id: "", amount: "", detail: "" });
      loadClassFees();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingClassFee(false);
    }
  }

  async function handleDeleteClassFee(id: string) {
    if (!confirm("Supprimer ce montant ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/economat/class-fees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      loadClassFees();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleSaveExemption(e: React.FormEvent) {
    e.preventDefault();
    if (!exemptionForm.student_id || !exemptionForm.academic_year || !exemptionForm.service_id) {
      setError("Élève, année et service requis.");
      return;
    }
    setSavingExemption(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/economat/exemptions`, {
        method: "POST",
        body: JSON.stringify({
          student_id: exemptionForm.student_id,
          academic_year: exemptionForm.academic_year,
          service_id: exemptionForm.service_id,
          exemption_type: exemptionForm.exemption_type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowExemptionForm(false);
      setExemptionForm({ student_id: "", academic_year: "", service_id: "", exemption_type: "FULL" });
      loadExemptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSavingExemption(false);
    }
  }

  async function handleDeleteExemption(id: string) {
    if (!confirm("Supprimer cette exonération ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/economat/exemptions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      loadExemptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse text-slate-500">Chargement...</div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Économat</h2>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--app-border)]">
        <button
          type="button"
          onClick={() => setTab("paiements")}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg border-b-2 -mb-px ${
            tab === "paiements"
              ? "border-[var(--school-accent-1)] text-[var(--school-accent-1)] bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Enregistrement des paiements
        </button>
        {canSeeServicesAndExemptions && (
          <>
            <button
              type="button"
              onClick={() => setTab("services")}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg border-b-2 -mb-px ${
                tab === "services"
                  ? "border-[var(--school-accent-1)] text-[var(--school-accent-1)] bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Services à payer par classe
            </button>
            <button
              type="button"
              onClick={() => setTab("exonerations")}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg border-b-2 -mb-px ${
                tab === "exonerations"
                  ? "border-[var(--school-accent-1)] text-[var(--school-accent-1)] bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              Exonérations (bourses / demi-bourses)
            </button>
          </>
        )}
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {/* Tab 1: Paiements */}
      {tab === "paiements" && (
        <div className="space-y-6">
          <form onSubmit={handleSubmitPayment} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-2xl">
            <h3 className="font-semibold text-slate-900">Enregistrer un paiement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire</label>
                <select
                  value={paymentForm.academic_year}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, academic_year: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Sélectionner</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.name}>{y.name}</option>
                  ))}
                  {currentYearLabel && !academicYears.some((y) => y.name === currentYearLabel) && (
                    <option value={currentYearLabel}>{currentYearLabel}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                <select
                  value={paymentForm.class_id}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, class_id: e.target.value, student_id: "" }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Sélectionner</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Élève</label>
              <select
                value={paymentForm.student_id}
                onChange={(e) => setPaymentForm((f) => ({ ...f, student_id: e.target.value }))}
                className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                required
              >
                <option value="">Sélectionner</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.order_number ? `${s.order_number} — ` : ""}{s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select
                  value={paymentForm.service_id}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, service_id: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Sélectionner</option>
                  {feeServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant payé</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount_paid: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date du paiement</label>
              <DateInputJJMMAAAA
                value={paymentForm.payment_date}
                onChange={(payment_date) => setPaymentForm((f) => ({ ...f, payment_date }))}
                className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                required
              />
            </div>
            <button type="submit" disabled={savingPayment} className="app-btn-primary disabled:opacity-60">
              {savingPayment ? "Enregistrement..." : "Enregistrer le paiement"}
            </button>
          </form>

          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Historique des paiements</h3>
            <div className="flex gap-4 mb-3">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Toutes les années</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.name}>{y.name}</option>
                ))}
              </select>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-900">Date</th>
                    <th className="px-4 py-3 font-medium text-slate-900">Élève</th>
                    <th className="px-4 py-3 font-medium text-slate-900">Classe</th>
                    <th className="px-4 py-3 font-medium text-slate-900">Année</th>
                    <th className="px-4 py-3 font-medium text-slate-900">Service</th>
                    <th className="px-4 py-3 font-medium text-slate-900 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun paiement</td></tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-600">{formatDateJJMMAAAA(t.payment_date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{t.student_name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{t.class_name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{t.academic_year}</td>
                        <td className="px-4 py-3 text-slate-600">{t.service_name ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(t.amount_paid).toLocaleString("fr-FR")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Services par classe */}
      {tab === "services" && canSeeServicesAndExemptions && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-900">Montants par classe et par année</h3>
            <div className="flex gap-2">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Toutes les années</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.name}>{y.name}</option>
                ))}
              </select>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => { setShowClassFeeForm(true); setEditingClassFee(null); setClassFeeForm({ academic_year: filterYear || academicYears[0]?.name || "", class_id: filterClass || "", service_id: "", amount: "", detail: "" }); }} className="app-btn-primary text-sm">
                Ajouter un montant
              </button>
            </div>
          </div>

          {showClassFeeForm && (
            <form onSubmit={handleSaveClassFee} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-lg">
              <h4 className="font-medium text-slate-900">{editingClassFee ? "Modifier le montant" : "Nouveau montant (classe, service, année)"}</h4>
              {!editingClassFee && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire</label>
                      <select
                        value={classFeeForm.academic_year}
                        onChange={(e) => setClassFeeForm((f) => ({ ...f, academic_year: e.target.value }))}
                        className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                        required
                      >
                        <option value="">Sélectionner</option>
                        {academicYears.map((y) => (
                          <option key={y.id} value={y.name}>{y.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Classe</label>
                      <select
                        value={classFeeForm.class_id}
                        onChange={(e) => setClassFeeForm((f) => ({ ...f, class_id: e.target.value }))}
                        className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                        required
                      >
                        <option value="">Sélectionner</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                    <select
                      value={classFeeForm.service_id}
                      onChange={(e) => setClassFeeForm((f) => ({ ...f, service_id: e.target.value }))}
                      className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {feeServices.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Montant</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingClassFee ? editingClassFee.amount : classFeeForm.amount}
                  onChange={(e) => (editingClassFee ? setEditingClassFee({ ...editingClassFee, amount: parseFloat(e.target.value) || 0 }) : setClassFeeForm((f) => ({ ...f, amount: e.target.value })))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Détail (optionnel)</label>
                <input
                  type="text"
                  value={classFeeForm.detail}
                  onChange={(e) => setClassFeeForm((f) => ({ ...f, detail: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  placeholder="Ex: trimestre 1"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingClassFee} className="app-btn-primary disabled:opacity-60">{savingClassFee ? "Enregistrement..." : "Enregistrer"}</button>
                <button type="button" onClick={() => { setShowClassFeeForm(false); setEditingClassFee(null); }} className="app-btn-secondary">Annuler</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-900">Année</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Classe</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Service</th>
                  <th className="px-4 py-3 font-medium text-slate-900 text-right">Montant</th>
                  {canSeeServicesAndExemptions && <th className="px-4 py-3 font-medium text-slate-900 w-32">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {classFees.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucun montant défini</td></tr>
                ) : (
                  classFees.map((cf) => (
                    <tr key={cf.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600">{cf.academic_year}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{cf.class_name}</td>
                      <td className="px-4 py-3 text-slate-600">{cf.service_name}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(cf.amount).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3 flex gap-2">
                        <button type="button" onClick={() => { setEditingClassFee(cf); setShowClassFeeForm(true); setClassFeeForm({ academic_year: cf.academic_year, class_id: cf.class_id, service_id: cf.service_id, amount: String(cf.amount), detail: cf.detail ?? "" }); }} className="text-[var(--school-accent-1)] hover:underline text-xs">Modifier</button>
                        <button type="button" onClick={() => handleDeleteClassFee(cf.id)} className="text-red-600 hover:underline text-xs">Supprimer</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Exonérations */}
      {tab === "exonerations" && canSeeServicesAndExemptions && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-semibold text-slate-900">Bourses et demi-bourses</h3>
            <div className="flex gap-2">
              <select
                value={exemptionFilterYear}
                onChange={(e) => setExemptionFilterYear(e.target.value)}
                className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Toutes les années</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.name}>{y.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => { setShowExemptionForm(true); setExemptionForm({ student_id: "", academic_year: exemptionFilterYear || academicYears[0]?.name || "", service_id: "", exemption_type: "FULL" }); }} className="app-btn-primary text-sm">
                Ajouter une exonération
              </button>
            </div>
          </div>

          {showExemptionForm && (
            <form onSubmit={handleSaveExemption} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-lg">
              <h4 className="font-medium text-slate-900">Nouvelle exonération</h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire</label>
                <select
                  value={exemptionForm.academic_year}
                  onChange={(e) => setExemptionForm((f) => ({ ...f, academic_year: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Sélectionner</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.name}>{y.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select
                  value={exemptionForm.service_id}
                  onChange={(e) => setExemptionForm((f) => ({ ...f, service_id: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Sélectionner</option>
                  {feeServices.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={exemptionForm.exemption_type}
                  onChange={(e) => setExemptionForm((f) => ({ ...f, exemption_type: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
                >
                  <option value="FULL">Bourse complète (100 %)</option>
                  <option value="HALF">Demi-bourse (50 %)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Élève (recherche par classe puis élève)</label>
                <ExemptionStudentSelect
                  classes={classes}
                  apiBase={API_BASE}
                  value={exemptionForm.student_id}
                  onChange={(id) => setExemptionForm((f) => ({ ...f, student_id: id }))}
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={savingExemption} className="app-btn-primary disabled:opacity-60">{savingExemption ? "Enregistrement..." : "Enregistrer"}</button>
                <button type="button" onClick={() => setShowExemptionForm(false)} className="app-btn-secondary">Annuler</button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-900">Élève</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Année</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Service</th>
                  <th className="px-4 py-3 font-medium text-slate-900">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-900 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exemptions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune exonération</td></tr>
                ) : (
                  exemptions.map((e) => (
                    <tr key={e.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{e.student_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{e.academic_year}</td>
                      <td className="px-4 py-3 text-slate-600">{e.service_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{e.exemption_type === "FULL" ? "Bourse complète" : "Demi-bourse"}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => handleDeleteExemption(e.id)} className="text-red-600 hover:underline text-xs">Supprimer</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ExemptionStudentSelect({
  classes,
  apiBase,
  value,
  onChange,
}: {
  classes: ClassItem[];
  apiBase: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      onChange("");
      return;
    }
    fetchWithAuth(`${apiBase}/students?class_id=${classId}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students ?? []);
        if (value && !(d.students ?? []).some((s: Student) => s.id === value)) onChange("");
      })
      .catch(() => setStudents([]));
  }, [classId, apiBase]);
  return (
    <div className="space-y-2">
      <select
        value={classId}
        onChange={(e) => { setClassId(e.target.value); onChange(""); }}
        className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
      >
        <option value="">Choisir une classe</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
        required
        disabled={!classId}
      >
        <option value="">Choisir un élève</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.order_number ? `${s.order_number} — ` : ""}{s.first_name} {s.last_name}
          </option>
        ))}
      </select>
    </div>
  );
}
