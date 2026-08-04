import { useEffect, useState } from "react";
import { API_BASE, fetchWithAuth } from "@/services/api";

type Year = { id: string; name: string };
type Period = { id: string; name: string };
type AcademicStats = {
  academic_year_id: string | null;
  academic_year_name: string | null;
  period_id: string | null;
  period_name: string | null;
  overview: {
    classes: number;
    students: number;
    teachers: number;
    grades: number;
    graded_students: number;
    school_average: number | null;
    success_rate: number | null;
  };
  distribution: { insuffisant: number; passable: number; bien: number; excellent: number };
  by_class: {
    class_id: string;
    class_name: string;
    level: string | null;
    students: number;
    graded_students: number;
    average: number | null;
    success_rate: number | null;
  }[];
  by_subject: { subject_id: string; subject_name: string; grades_count: number; average: number | null }[];
  by_teacher: {
    teacher_id: number;
    teacher_name: string;
    assignments: number;
    grades_count: number;
    average: number | null;
  }[];
  top_students: { id: string; name: string; class_name: string | null; average: number }[];
  bottom_students: { id: string; name: string; class_name: string | null; average: number }[];
  discipline: {
    absences: number;
    presents: number;
    latenesses: number;
    deductions_count: number;
    deductions_points: number;
  };
};

function fmt(n: number | null | undefined, digits = 2) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtInt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("fr-FR");
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export function DashboardStatsAcademiquesPage() {
  const [years, setYears] = useState<Year[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [yearId, setYearId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
        const current = ctx.current_academic_year_id || list[0]?.id || "";
        setYearId(current);
        if (ctx.current_period_id) setPeriodId(ctx.current_period_id);
      } catch {
        setYears([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!yearId) {
      setPeriods([]);
      return;
    }
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE}/periods?academic_year_id=${yearId}`);
        const data = await res.json();
        setPeriods(data.periods ?? []);
      } catch {
        setPeriods([]);
      }
    })();
  }, [yearId]);

  useEffect(() => {
    if (!yearId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ academic_year_id: yearId });
        if (periodId) params.set("period_id", periodId);
        const res = await fetchWithAuth(`${API_BASE}/statistics/academic?${params}`);
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
  }, [yearId, periodId]);

  const dist = stats?.distribution;
  const distTotal = dist
    ? dist.insuffisant + dist.passable + dist.bien + dist.excellent
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Stats académiques</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={yearId}
            onChange={(e) => {
              setYearId(e.target.value);
              setPeriodId("");
            }}
            className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm min-w-[160px]"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          <select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="">Toutes périodes</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      {loading ? (
        <div className="animate-pulse text-slate-500 py-8">Chargement...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <Kpi label="Moyenne école" value={fmt(stats.overview.school_average)} accent="text-slate-900" />
            <Kpi
              label="Réussite (≥ 5/10)"
              value={stats.overview.success_rate != null ? `${fmt(stats.overview.success_rate, 1)} %` : "—"}
            />
            <Kpi label="Élèves notés" value={fmtInt(stats.overview.graded_students)} />
            <Kpi label="Notes" value={fmtInt(stats.overview.grades)} />
            <Kpi label="Classes" value={fmtInt(stats.overview.classes)} />
            <Kpi label="Professeurs" value={fmtInt(stats.overview.teachers)} />
          </div>

          {dist && distTotal > 0 && (
            <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white space-y-3">
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                {[
                  { n: dist.insuffisant, c: "bg-red-400" },
                  { n: dist.passable, c: "bg-amber-400" },
                  { n: dist.bien, c: "bg-sky-400" },
                  { n: dist.excellent, c: "bg-emerald-500" },
                ].map((b, i) => (
                  <div
                    key={i}
                    className={b.c}
                    style={{ width: `${(b.n / distTotal) * 100}%` }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <span className="text-slate-600">
                  &lt; 5 · <strong>{dist.insuffisant}</strong>
                </span>
                <span className="text-slate-600">
                  5–7 · <strong>{dist.passable}</strong>
                </span>
                <span className="text-slate-600">
                  7–8,5 · <strong>{dist.bien}</strong>
                </span>
                <span className="text-slate-600">
                  ≥ 8,5 · <strong>{dist.excellent}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Kpi label="Présents" value={fmtInt(stats.discipline.presents)} />
            <Kpi label="Absences" value={fmtInt(stats.discipline.absences)} accent="text-red-700" />
            <Kpi label="Retards" value={fmtInt(stats.discipline.latenesses)} />
            <Kpi label="Sanctions" value={fmtInt(stats.discipline.deductions_count)} />
            <Kpi label="Points déduits" value={fmtInt(stats.discipline.deductions_points)} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <TableCard title="Classes">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2 font-medium">Classe</th>
                    <th className="py-2 pr-2 font-medium text-right">Élèves</th>
                    <th className="py-2 pr-2 font-medium text-right">Moy.</th>
                    <th className="py-2 font-medium text-right">Réussite</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_class.map((c) => (
                    <tr key={c.class_id} className="border-b border-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{c.class_name}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">
                        {c.graded_students}/{c.students}
                      </td>
                      <td className="py-2 pr-2 text-right font-semibold">{fmt(c.average)}</td>
                      <td className="py-2 text-right text-slate-600">
                        {c.success_rate != null ? `${fmt(c.success_rate, 0)} %` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableCard>

            <TableCard title="Matières">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2 font-medium">Matière</th>
                    <th className="py-2 pr-2 font-medium text-right">Notes</th>
                    <th className="py-2 font-medium text-right">Moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_subject.map((s) => (
                    <tr key={s.subject_id} className="border-b border-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{s.subject_name}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">{fmtInt(s.grades_count)}</td>
                      <td className="py-2 text-right font-semibold">{fmt(s.average)}</td>
                    </tr>
                  ))}
                  {stats.by_subject.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>

            <TableCard title="Professeurs">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="py-2 pr-2 font-medium">Professeur</th>
                    <th className="py-2 pr-2 font-medium text-right">Affect.</th>
                    <th className="py-2 font-medium text-right">Moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.by_teacher.map((t) => (
                    <tr key={t.teacher_id} className="border-b border-slate-50">
                      <td className="py-2 pr-2 font-medium text-slate-900">{t.teacher_name || "—"}</td>
                      <td className="py-2 pr-2 text-right text-slate-600">{fmtInt(t.assignments)}</td>
                      <td className="py-2 text-right font-semibold">{fmt(t.average)}</td>
                    </tr>
                  ))}
                  {stats.by_teacher.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableCard>

            <div className="grid grid-cols-1 gap-4">
              <TableCard title="Meilleures moyennes">
                <StudentRows rows={stats.top_students} />
              </TableCard>
              <TableCard title="Moyennes les plus basses">
                <StudentRows rows={stats.bottom_students} />
              </TableCard>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-[var(--app-border)] bg-white overflow-x-auto">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StudentRows({
  rows,
}: {
  rows: { id: string; name: string; class_name: string | null; average: number }[];
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-3">—</p>;
  }
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id} className="border-b border-slate-50">
            <td className="py-1.5 pr-2 text-slate-400 w-6">{i + 1}</td>
            <td className="py-1.5 pr-2 font-medium text-slate-900">{r.name}</td>
            <td className="py-1.5 pr-2 text-slate-500">{r.class_name ?? "—"}</td>
            <td className="py-1.5 text-right font-semibold">{fmt(r.average)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
