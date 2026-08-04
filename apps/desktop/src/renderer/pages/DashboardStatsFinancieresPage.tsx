import { useEffect, useState } from "react";
import { API_BASE, fetchWithAuth } from "@/services/api";

type Year = { id: string; name: string };
type FinancialStats = {
  academic_year: string;
  date_from: string;
  date_to: string;
  overview: {
    amount_due: number;
    amount_paid: number;
    balance: number;
    collection_rate: number | null;
    students_total: number;
    students_with_balance: number;
    students_fully_paid: number;
    transactions_count: number;
  };
  cashflow: {
    total_entrees: number;
    total_sorties: number;
    solde: number;
    detail_entrees_economat: number;
    detail_entrees_autres: number;
    detail_sorties: number;
  };
  by_class: {
    class_id: string;
    class_name: string;
    students: number;
    amount_due: number;
    amount_paid: number;
    balance: number;
    collection_rate: number | null;
  }[];
  by_service: {
    service_id: string;
    service_name: string;
    amount_due: number;
    amount_paid: number;
    balance: number;
    collection_rate: number | null;
  }[];
  by_month: { month: string; amount: number }[];
  top_debtors: {
    student_id: string;
    student_name: string;
    class_name: string | null;
    amount_due: number;
    amount_paid: number;
    balance: number;
  }[];
  banks?: {
    total_balance: number;
    accounts: {
      id: string;
      bank_name: string;
      account_name: string;
      account_number: string | null;
      opening_balance: number;
      inflows: number;
      outflows: number;
      balance: number;
    }[];
  };
};

function money(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function pct(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export function DashboardStatsFinancieresPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [yearName, setYearName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    setDateFrom(`${y}-${m}-01`);
    setDateTo(d.toISOString().slice(0, 10));

    (async () => {
      try {
        const [yRes, ctxRes] = await Promise.all([
          fetchWithAuth(`${API_BASE}/academic-years`),
          fetchWithAuth(`${API_BASE}/school/current-context`),
        ]);
        const yData = await yRes.json();
        const ctx = await ctxRes.json();
        const list: Year[] = yData.academic_years ?? yData.years ?? [];
        setYears(list);
        setYearName(ctx.current_academic_year_name || list[0]?.name || "");
      } catch {
        setYears([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!yearName || !dateFrom || !dateTo) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          academic_year: yearName,
          date_from: dateFrom,
          date_to: dateTo,
        });
        const res = await fetchWithAuth(`${API_BASE}/statistics/financial?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
        setStats(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
        setStats(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [yearName, dateFrom, dateTo]);

  const maxMonth = stats?.by_month.reduce((m, x) => Math.max(m, x.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Stats financières</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={yearName}
            onChange={(e) => setYearName(e.target.value)}
            className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm min-w-[160px]"
          >
            {years.map((y) => (
              <option key={y.id} value={y.name}>
                {y.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {loading ? (
        <div className="animate-pulse text-slate-500 py-8">Chargement...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <Kpi label="Total dû" value={money(stats.overview.amount_due)} />
            <Kpi label="Encaissé" value={money(stats.overview.amount_paid)} accent="text-green-700" />
            <Kpi
              label="Reste à recouvrer"
              value={money(stats.overview.balance)}
              accent={stats.overview.balance > 0 ? "text-red-700" : "text-green-700"}
            />
            <Kpi label="Taux de recouvrement" value={pct(stats.overview.collection_rate)} />
            <Kpi label="Soldes ouverts" value={String(stats.overview.students_with_balance)} />
            <Kpi label="À jour" value={String(stats.overview.students_fully_paid)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Kpi label="Entrées (période)" value={money(stats.cashflow.total_entrees)} accent="text-green-700" />
            <Kpi label="Sorties (période)" value={money(stats.cashflow.total_sorties)} accent="text-red-700" />
            <Kpi
              label="Solde caisse"
              value={money(stats.cashflow.solde)}
              accent={stats.cashflow.solde >= 0 ? "text-green-700" : "text-red-700"}
            />
            <Kpi
              label="Soldes bancaires"
              value={money(stats.banks?.total_balance ?? 0)}
              accent="text-slate-900"
            />
          </div>

          {stats.banks && stats.banks.accounts.length > 0 && (
            <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Comptes bancaires</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2 font-medium">Banque</th>
                    <th className="py-2 pr-2 font-medium">Compte</th>
                    <th className="py-2 pr-2 font-medium text-right">Ouverture</th>
                    <th className="py-2 pr-2 font-medium text-right">Entrées</th>
                    <th className="py-2 pr-2 font-medium text-right">Sorties</th>
                    <th className="py-2 font-medium text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.banks.accounts.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{a.bank_name}</td>
                      <td className="py-2 pr-2 text-slate-600">
                        {a.account_name}
                        {a.account_number ? ` · ${a.account_number}` : ""}
                      </td>
                      <td className="py-2 pr-2 text-right text-slate-600">{money(a.opening_balance)}</td>
                      <td className="py-2 pr-2 text-right text-green-700">{money(a.inflows)}</td>
                      <td className="py-2 pr-2 text-right text-red-700">{money(a.outflows)}</td>
                      <td className="py-2 text-right font-semibold">{money(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Par classe</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2 font-medium">Classe</th>
                    <th className="py-2 pr-2 font-medium text-right">Dû</th>
                    <th className="py-2 pr-2 font-medium text-right">Payé</th>
                    <th className="py-2 font-medium text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_class.map((c) => (
                    <tr key={c.class_id} className="border-b border-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{c.class_name}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">{money(c.amount_due)}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">{money(c.amount_paid)}</td>
                      <td className="py-2 text-right font-semibold">{pct(c.collection_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Par service</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2 font-medium">Service</th>
                    <th className="py-2 pr-2 font-medium text-right">Dû</th>
                    <th className="py-2 pr-2 font-medium text-right">Payé</th>
                    <th className="py-2 font-medium text-right">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_service.map((s) => (
                    <tr key={s.service_id} className="border-b border-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{s.service_name}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">{money(s.amount_due)}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">{money(s.amount_paid)}</td>
                      <td className="py-2 text-right font-semibold">{pct(s.collection_rate)}</td>
                    </tr>
                  ))}
                  {stats.by_service.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Encaissements mensuels</h3>
              {stats.by_month.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">—</p>
              ) : (
                <div className="space-y-2">
                  {stats.by_month.map((m) => (
                    <div key={m.month} className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-slate-500 tabular-nums">{m.month}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: maxMonth > 0 ? `${(m.amount / maxMonth) * 100}%` : "0%",
                            backgroundColor: "var(--school-accent-1)",
                          }}
                        />
                      </div>
                      <span className="w-28 text-right font-medium tabular-nums">{money(m.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white overflow-x-auto">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Plus gros soldes</h3>
              {stats.top_debtors.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">—</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="py-2 pr-2 font-medium">Élève</th>
                      <th className="py-2 pr-2 font-medium">Classe</th>
                      <th className="py-2 font-medium text-right">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_debtors.map((d) => (
                      <tr key={d.student_id} className="border-b border-slate-50">
                        <td className="py-2 pr-2 font-medium text-slate-900">{d.student_name}</td>
                        <td className="py-2 pr-2 text-slate-500">{d.class_name ?? "—"}</td>
                        <td className="py-2 text-right font-semibold text-red-700">{money(d.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
