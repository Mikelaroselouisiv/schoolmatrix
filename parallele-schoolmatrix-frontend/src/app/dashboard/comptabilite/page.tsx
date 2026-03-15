"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";
import { formatDateJJMMAAAA, getTodayLocalYYYYMMDD } from "@/src/lib/format";
import { DateInputJJMMAAAA } from "@/src/components/DateInputJJMMAAAA";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type Exercice = { id: string; date_debut: string; date_fin: string; statut: string };
type Account = { id: string; code: string; label: string; type: string };
type Activity = { id: string; name: string; code: string | null };
type Entry = {
  id: string;
  entry_date: string;
  label: string;
  source: string;
  lines: { account_code: string; account_label: string; debit: number; credit: number }[];
};
type BalanceLine = { account_code: string; account_label: string; total_debit: number; total_credit: number; solde: number };

type ManualLine = { account_id: string; debit: string; credit: string };

export default function ComptabilitePage() {
  const [tab, setTab] = useState<"balance" | "journal">("balance");
  const [exercices, setExercices] = useState<Exercice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [openExercice, setOpenExercice] = useState<Exercice | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [balance, setBalance] = useState<BalanceLine[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showOtherRevenueForm, setShowOtherRevenueForm] = useState(false);
  const [otherRevenueForm, setOtherRevenueForm] = useState({
    revenue_date: getTodayLocalYYYYMMDD(),
    amount: "",
    label: "",
    category: "",
    fee_service_id: "" as string,
  });
  const [savingOtherRevenue, setSavingOtherRevenue] = useState(false);

  const [showOpenFirst, setShowOpenFirst] = useState(false);
  const [openFirstForm, setOpenFirstForm] = useState({ date_debut: "", date_fin: "" });
  const [savingOpenFirst, setSavingOpenFirst] = useState(false);
  const [showOpenNext, setShowOpenNext] = useState(false);
  const [openNextForm, setOpenNextForm] = useState({ date_debut: "", date_fin: "" });
  const [savingOpenNext, setSavingOpenNext] = useState(false);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryForm, setManualEntryForm] = useState({
    entry_date: getTodayLocalYYYYMMDD(),
    label: "",
    source: "OUVERTURE" as string,
    lines: [{ account_id: "", debit: "", credit: "" }] as ManualLine[],
  });
  const [savingManualEntry, setSavingManualEntry] = useState(false);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addAccountForm, setAddAccountForm] = useState({ code: "", label: "", type: "CHARGE" as string });
  const [savingAddAccount, setSavingAddAccount] = useState(false);
  const [suggestingType, setSuggestingType] = useState(false);

  async function loadExercices() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/exercices`);
      const data = await res.json();
      setExercices(data.exercices ?? []);
      const openRes = await fetchWithAuth(`${API_BASE}/finance/exercices/open`);
      const openData = await openRes.json();
      setOpenExercice(openData.exercice ?? null);
    } catch {
      setExercices([]);
      setOpenExercice(null);
    }
  }

  async function loadAccounts() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/accounts`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch {
      setAccounts([]);
    }
  }

  async function fetchSuggestType(code: string) {
    if (!code.trim()) return;
    setSuggestingType(true);
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/accounts/suggest-type?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (data.ok && data.type) {
        setAddAccountForm((f) => ({
          ...f,
          type: data.type,
          ...(data.label_suggestion && !f.label ? { label: data.label_suggestion } : {}),
        }));
      }
    } catch {
      // ignore
    } finally {
      setSuggestingType(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddAccount(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: addAccountForm.code.trim(),
          label: addAccountForm.label.trim(),
          type: addAccountForm.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de la création du compte");
      setShowAddAccount(false);
      setAddAccountForm({ code: "", label: "", type: "CHARGE" });
      loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingAddAccount(false);
    }
  }

  async function loadActivities() {
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/activities`);
      const data = await res.json();
      setActivities(data.activities ?? []);
    } catch {
      setActivities([]);
    }
  }

  async function handleOpenFirst(e: React.FormEvent) {
    e.preventDefault();
    setSavingOpenFirst(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/exercices/open-first`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openFirstForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowOpenFirst(false);
      setOpenFirstForm({ date_debut: "", date_fin: "" });
      loadExercices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingOpenFirst(false);
    }
  }

  async function handleOpenNext(e: React.FormEvent) {
    e.preventDefault();
    setSavingOpenNext(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/exercices/open-next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(openNextForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowOpenNext(false);
      setOpenNextForm({ date_debut: "", date_fin: "" });
      loadExercices();
      if (openExercice) loadBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingOpenNext(false);
    }
  }

  function addManualLine() {
    setManualEntryForm((f) => ({
      ...f,
      lines: [...f.lines, { account_id: "", debit: "", credit: "" }],
    }));
  }
  function updateManualLine(i: number, field: keyof ManualLine, value: string) {
    setManualEntryForm((f) => ({
      ...f,
      lines: f.lines.map((l, j) => (j === i ? { ...l, [field]: value } : l)),
    }));
  }
  function removeManualLine(i: number) {
    setManualEntryForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));
  }

  async function handleCreateManualEntry(e: React.FormEvent) {
    e.preventDefault();
    const lines = manualEntryForm.lines
      .filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }));
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError("Le total débit doit être égal au total crédit.");
      return;
    }
    if (!openExercice || lines.length === 0) return;
    setSavingManualEntry(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercice_id: openExercice.id,
          entry_date: manualEntryForm.entry_date,
          label: manualEntryForm.label.trim() || "Écriture manuelle",
          source: manualEntryForm.source,
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setShowManualEntry(false);
      setManualEntryForm({
        entry_date: getTodayLocalYYYYMMDD(),
        label: "",
        source: "MANUEL",
        lines: [{ account_id: "", debit: "", credit: "" }],
      });
      loadEntries();
      loadBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingManualEntry(false);
    }
  }

  async function handleCreateOtherRevenue(e: React.FormEvent) {
    e.preventDefault();
    setSavingOtherRevenue(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/other-revenues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue_date: otherRevenueForm.revenue_date,
          amount: parseFloat(otherRevenueForm.amount) || 0,
          label: otherRevenueForm.label.trim(),
          category: otherRevenueForm.category.trim() || undefined,
          fee_service_id: otherRevenueForm.fee_service_id || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      setShowOtherRevenueForm(false);
      setOtherRevenueForm({ revenue_date: getTodayLocalYYYYMMDD(), amount: "", label: "", category: "", fee_service_id: "" });
      if (openExercice) loadEntries();
      loadBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingOtherRevenue(false);
    }
  }

  async function loadEntries() {
    if (!openExercice) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/entries?exercice_id=${openExercice.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setEntries([]);
    }
  }

  async function loadBalance() {
    if (!openExercice) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/balance?exercice_id=${openExercice.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setBalance(data.balance ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBalance([]);
    }
  }

  useEffect(() => {
    loadExercices();
    loadAccounts();
    loadActivities();
  }, []);

  useEffect(() => {
    if (openExercice) {
      if (tab === "journal") loadEntries();
      else loadBalance();
    }
    setLoading(false);
  }, [openExercice, tab]);

  const totalDebitManual = manualEntryForm.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCreditManual = manualEntryForm.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Comptabilité</h2>
      <p className="text-slate-600 text-sm">
        Le logiciel tient la comptabilité de l&apos;établissement. Ouvrez un exercice, saisissez l&apos;écriture d&apos;ouverture (immobilisations, passifs, caisse, capital…), puis les opérations courantes (paiements, dépenses, autres revenus) alimentent automatiquement le journal.
      </p>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {/* Gestion des exercices */}
      <div className="rounded-xl border border-[var(--app-border)] bg-white p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Exercice comptable</h3>
        {openExercice ? (
          <div className="space-y-3">
            <p className="text-slate-700">
              Exercice ouvert : <strong>{openExercice.date_debut}</strong> → <strong>{openExercice.date_fin}</strong>
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowManualEntry(true)} className="app-btn-primary text-sm">
                Écriture manuelle ou d&apos;ouverture
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOpenNext(true);
                  const end = openExercice.date_fin;
                  const [y] = end.split("-");
                  setOpenNextForm({ date_debut: `${parseInt(y, 10) + 1}-09-01`, date_fin: `${parseInt(y, 10) + 2}-08-31` });
                }}
                className="app-btn-secondary text-sm"
              >
                Clôturer cet exercice et ouvrir le suivant
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-amber-700 font-medium">Aucun exercice ouvert. Les écritures (paiements, dépenses, autres revenus) ne seront pas enregistrées tant qu&apos;un exercice n&apos;est pas ouvert.</p>
            <button type="button" onClick={() => setShowOpenFirst(true)} className="app-btn-primary text-sm">
              Ouvrir le premier exercice
            </button>
          </div>
        )}

        {showOpenFirst && (
          <form onSubmit={handleOpenFirst} className="mt-4 p-4 rounded-lg bg-slate-50 border border-[var(--app-border)] space-y-3 max-w-md">
            <h4 className="font-medium text-slate-900">Ouverture du premier exercice</h4>
            <p className="text-sm text-slate-600">Indiquez la période (ex. 01/09/2024 - 31/08/2025). Ensuite, saisissez l&apos;écriture d&apos;ouverture (immobilisations, passifs, caisse, capital…) via « Écriture manuelle ou d&apos;ouverture ».</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date début</label>
              <input type="date" value={openFirstForm.date_debut} onChange={(e) => setOpenFirstForm((f) => ({ ...f, date_debut: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date fin</label>
              <input type="date" value={openFirstForm.date_fin} onChange={(e) => setOpenFirstForm((f) => ({ ...f, date_fin: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingOpenFirst} className="app-btn-primary disabled:opacity-60">{savingOpenFirst ? "Ouverture..." : "Ouvrir"}</button>
              <button type="button" onClick={() => setShowOpenFirst(false)} className="app-btn-secondary">Annuler</button>
            </div>
          </form>
        )}

        {showOpenNext && openExercice && (
          <form onSubmit={handleOpenNext} className="mt-4 p-4 rounded-lg bg-slate-50 border border-[var(--app-border)] space-y-3 max-w-md">
            <h4 className="font-medium text-slate-900">Clôturer l&apos;exercice en cours et ouvrir le suivant</h4>
            <p className="text-sm text-slate-600">Les écritures de clôture (charges/produits → résultat → report) seront créées, puis le report à nouveau sera reporté sur le nouvel exercice.</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nouvel exercice - Date début</label>
              <input type="date" value={openNextForm.date_debut} onChange={(e) => setOpenNextForm((f) => ({ ...f, date_debut: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nouvel exercice - Date fin</label>
              <input type="date" value={openNextForm.date_fin} onChange={(e) => setOpenNextForm((f) => ({ ...f, date_fin: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingOpenNext} className="app-btn-primary disabled:opacity-60">{savingOpenNext ? "Traitement..." : "Clôturer et ouvrir"}</button>
              <button type="button" onClick={() => setShowOpenNext(false)} className="app-btn-secondary">Annuler</button>
            </div>
          </form>
        )}
      </div>

      {/* Écriture manuelle / ouverture */}
      {showManualEntry && openExercice && (
        <div className="rounded-xl border border-[var(--app-border)] bg-white p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Écriture manuelle ou d&apos;ouverture</h3>
          <p className="text-sm text-slate-600 mb-4">
            Pour l&apos;ouverture du premier exercice : saisissez les soldes d&apos;ouverture (immobilisations, caisse, banque, capital, dettes, report à nouveau…). Débit = crédit obligatoirement.
          </p>
          <form onSubmit={handleCreateManualEntry} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <DateInputJJMMAAAA value={manualEntryForm.entry_date} onChange={(v) => setManualEntryForm((f) => ({ ...f, entry_date: v }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Libellé</label>
                <input type="text" value={manualEntryForm.label} onChange={(e) => setManualEntryForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex. Ouverture exercice 2024-2025" className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select value={manualEntryForm.source} onChange={(e) => setManualEntryForm((f) => ({ ...f, source: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 max-w-xs">
                <option value="OUVERTURE">Ouverture</option>
                <option value="MANUEL">Manuel</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Lignes (compte, débit, crédit)</span>
                <button type="button" onClick={addManualLine} className="text-sm text-[var(--school-accent-1)] hover:underline">+ Ligne</button>
              </div>
              <div className="space-y-2">
                {manualEntryForm.lines.map((line, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select
                      value={line.account_id}
                      onChange={(e) => updateManualLine(i, "account_id", e.target.value)}
                      className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm min-w-[200px]"
                      required
                    >
                      <option value="">Compte</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} {a.label}</option>
                      ))}
                    </select>
                    <input type="number" step="0.01" min="0" placeholder="Débit" value={line.debit} onChange={(e) => updateManualLine(i, "debit", e.target.value)} className="w-24 border border-[var(--app-border)] rounded-lg px-2 py-2 text-sm" />
                    <input type="number" step="0.01" min="0" placeholder="Crédit" value={line.credit} onChange={(e) => updateManualLine(i, "credit", e.target.value)} className="w-24 border border-[var(--app-border)] rounded-lg px-2 py-2 text-sm" />
                    {manualEntryForm.lines.length > 1 && <button type="button" onClick={() => removeManualLine(i)} className="text-red-600 text-sm">Suppr.</button>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-slate-600">Total débit : <strong>{totalDebitManual.toLocaleString("fr-FR")}</strong> — Total crédit : <strong>{totalCreditManual.toLocaleString("fr-FR")}</strong> {Math.abs(totalDebitManual - totalCreditManual) > 0.01 && <span className="text-red-600">(doivent être égaux)</span>}</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingManualEntry || Math.abs(totalDebitManual - totalCreditManual) > 0.01} className="app-btn-primary disabled:opacity-60">{savingManualEntry ? "Enregistrement..." : "Enregistrer"}</button>
              <button type="button" onClick={() => setShowManualEntry(false)} className="app-btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {/* Balance / Journal */}
      {openExercice && (
        <>
          <div className="flex gap-2 border-b border-[var(--app-border)]">
            <button type="button" onClick={() => setTab("balance")} className={`px-4 py-2 font-medium text-sm rounded-t-lg border-b-2 -mb-px ${tab === "balance" ? "border-[var(--school-accent-1)] text-[var(--school-accent-1)] bg-white" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
              Balance des comptes
            </button>
            <button type="button" onClick={() => setTab("journal")} className={`px-4 py-2 font-medium text-sm rounded-t-lg border-b-2 -mb-px ${tab === "journal" ? "border-[var(--school-accent-1)] text-[var(--school-accent-1)] bg-white" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
              Journal (écritures)
            </button>
          </div>

          {tab === "balance" && (
            <div className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-[var(--app-border)]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-slate-900 text-left">Compte</th>
                    <th className="px-4 py-3 font-medium text-slate-900 text-left">Libellé</th>
                    <th className="px-4 py-3 font-medium text-slate-900 text-right">Débit</th>
                    <th className="px-4 py-3 font-medium text-slate-900 text-right">Crédit</th>
                    <th className="px-4 py-3 font-medium text-slate-900 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chargement...</td></tr> : balance.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucune écriture sur cet exercice.</td></tr> : balance.map((b) => (
                    <tr key={b.account_code} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono text-slate-700">{b.account_code}</td>
                      <td className="px-4 py-3 text-slate-900">{b.account_label}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{b.total_debit.toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{b.total_credit.toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{b.solde.toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "journal" && (
            <div className="space-y-4">
              {loading ? <div className="animate-pulse text-slate-500 py-8">Chargement...</div> : entries.length === 0 ? <p className="text-slate-500">Aucune écriture.</p> : entries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[var(--app-border)] bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-[var(--app-border)] flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-medium text-slate-900">{formatDateJJMMAAAA(entry.entry_date)}</span>
                    <span className="text-slate-600">{entry.label}</span>
                    <span className="text-xs text-slate-500">({entry.source})</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50/50"><th className="px-4 py-2 text-left font-medium text-slate-700">Compte</th><th className="px-4 py-2 text-right font-medium text-slate-700">Débit</th><th className="px-4 py-2 text-right font-medium text-slate-700">Crédit</th></tr></thead>
                    <tbody>
                      {entry.lines.map((line, i) => (
                        <tr key={i} className="border-t border-[var(--app-border)]">
                          <td className="px-4 py-2 font-mono text-slate-700">{line.account_code} {line.account_label}</td>
                          <td className="px-4 py-2 text-right text-slate-900">{line.debit > 0 ? line.debit.toLocaleString("fr-FR") : ""}</td>
                          <td className="px-4 py-2 text-right text-slate-900">{line.credit > 0 ? line.credit.toLocaleString("fr-FR") : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-[var(--app-border)] bg-white p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Autres revenus (dons, subventions, ventes…)</h3>
            <p className="text-sm text-slate-600 mb-3">La date du revenu doit être comprise dans la période de l&apos;exercice ouvert.</p>
            {showOtherRevenueForm ? (
              <form onSubmit={handleCreateOtherRevenue} className="space-y-3 max-w-md mb-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><DateInputJJMMAAAA value={otherRevenueForm.revenue_date} onChange={(v) => setOtherRevenueForm((f) => ({ ...f, revenue_date: v }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Montant</label><input type="number" step="0.01" min="0" value={otherRevenueForm.amount} onChange={(e) => setOtherRevenueForm((f) => ({ ...f, amount: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Libellé</label><input type="text" value={otherRevenueForm.label} onChange={(e) => setOtherRevenueForm((f) => ({ ...f, label: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" required /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Catégorie (optionnel)</label><input type="text" value={otherRevenueForm.category} onChange={(e) => setOtherRevenueForm((f) => ({ ...f, category: e.target.value }))} placeholder="don, subvention, vente..." className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Activité parascolaire (optionnel)</label><select value={otherRevenueForm.fee_service_id} onChange={(e) => setOtherRevenueForm((f) => ({ ...f, fee_service_id: e.target.value }))} className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"><option value="">—</option>{activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                <div className="flex gap-2"><button type="submit" disabled={savingOtherRevenue} className="app-btn-primary disabled:opacity-60">{savingOtherRevenue ? "Enregistrement..." : "Enregistrer"}</button><button type="button" onClick={() => setShowOtherRevenueForm(false)} className="app-btn-secondary">Annuler</button></div>
              </form>
            ) : (
              <button type="button" onClick={() => setShowOtherRevenueForm(true)} className="app-btn-secondary text-sm">Enregistrer un autre revenu</button>
            )}
          </div>
        </>
      )}

      {/* Plan comptable */}
      <div className="rounded-xl border border-[var(--app-border)] bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Plan comptable</h3>
          <button type="button" onClick={() => { setShowAddAccount(true); setAddAccountForm({ code: "", label: "", type: "CHARGE" }); setError(""); }} className="app-btn-primary text-sm">Ajouter un compte</button>
        </div>
        {showAddAccount && (
          <form onSubmit={handleAddAccount} className="mb-4 p-4 bg-slate-50 rounded-lg border border-[var(--app-border)] space-y-3 max-w-lg">
            <h4 className="font-medium text-slate-900">Nouveau compte</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  value={addAccountForm.code}
                  onChange={(e) => setAddAccountForm((f) => ({ ...f, code: e.target.value }))}
                  onBlur={() => fetchSuggestType(addAccountForm.code)}
                  placeholder="ex. 512000"
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 font-mono text-sm"
                  required
                />
                {suggestingType && <span className="text-xs text-slate-500">Suggestion en cours...</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Libellé</label>
                <input
                  type="text"
                  value={addAccountForm.label}
                  onChange={(e) => setAddAccountForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="ex. Banque"
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={addAccountForm.type}
                  onChange={(e) => setAddAccountForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ACTIF">Actif (bilan)</option>
                  <option value="PASSIF">Passif (bilan)</option>
                  <option value="CHARGE">Charge (résultat)</option>
                  <option value="PRODUIT">Produit (résultat)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingAddAccount} className="app-btn-primary disabled:opacity-60 text-sm">{savingAddAccount ? "Enregistrement..." : "Enregistrer"}</button>
              <button type="button" onClick={() => setShowAddAccount(false)} className="app-btn-secondary text-sm">Annuler</button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[var(--app-border)]">
              <tr>
                <th className="px-3 py-2 font-medium text-slate-900 text-left">Code</th>
                <th className="px-3 py-2 font-medium text-slate-900 text-left">Libellé</th>
                <th className="px-3 py-2 font-medium text-slate-900 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-[var(--app-border)]">
                  <td className="px-3 py-2 font-mono text-slate-700">{a.code}</td>
                  <td className="px-3 py-2 text-slate-900">{a.label}</td>
                  <td className="px-3 py-2 text-slate-600">{a.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
