import { useEffect, useState } from "react";
import { API_BASE, fetchWithAuth } from "@/services/api";

type BankAccount = {
  id: string;
  bank_id: string;
  name: string;
  account_number: string | null;
  opening_balance: number;
  active: boolean;
  balance: number;
};

type Bank = {
  id: string;
  name: string;
  active: boolean;
  accounts: BankAccount[];
};

function money(n: number) {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function DashboardBanquesPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bankName, setBankName] = useState("");
  const [savingBank, setSavingBank] = useState(false);
  const [accountForms, setAccountForms] = useState<
    Record<string, { name: string; account_number: string; opening_balance: string }>
  >({});
  const [savingAccount, setSavingAccount] = useState<string | null>(null);

  async function load() {
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/banks`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setBanks(data.banks ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setBanks([]);
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleCreateBank(e: React.FormEvent) {
    e.preventDefault();
    if (!bankName.trim()) return;
    setSavingBank(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/banks`, {
        method: "POST",
        body: JSON.stringify({ name: bankName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setBankName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingBank(false);
    }
  }

  async function handleDeleteBank(id: string) {
    if (!confirm("Supprimer cette banque et ses comptes ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/banks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  function accountForm(bankId: string) {
    return accountForms[bankId] ?? { name: "", account_number: "", opening_balance: "0" };
  }

  async function handleCreateAccount(e: React.FormEvent, bankId: string) {
    e.preventDefault();
    const f = accountForm(bankId);
    if (!f.name.trim()) return;
    setSavingAccount(bankId);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/bank-accounts`, {
        method: "POST",
        body: JSON.stringify({
          bank_id: bankId,
          name: f.name.trim(),
          account_number: f.account_number.trim() || null,
          opening_balance: parseFloat(f.opening_balance) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setAccountForms((prev) => ({
        ...prev,
        [bankId]: { name: "", account_number: "", opening_balance: "0" },
      }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSavingAccount(null);
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Supprimer ce compte ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/finance/bank-accounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  const totalBalance = banks.reduce(
    (s, b) => s + b.accounts.reduce((ss, a) => ss + (a.balance ?? 0), 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Banques</h2>
        <div className="text-sm text-slate-600">
          Solde total · <span className="font-semibold text-slate-900">{money(totalBalance)}</span>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      <form onSubmit={handleCreateBank} className="p-5 rounded-xl border border-[var(--app-border)] bg-white flex flex-wrap gap-3 items-end max-w-xl">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nouvelle banque</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2"
            placeholder="Nom de la banque"
            required
          />
        </div>
        <button type="submit" disabled={savingBank} className="app-btn-primary disabled:opacity-60">
          {savingBank ? "..." : "Ajouter"}
        </button>
      </form>

      {loading ? (
        <div className="animate-pulse text-slate-500 py-8">Chargement...</div>
      ) : banks.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucune banque</p>
      ) : (
        <div className="space-y-4">
          {banks.map((bank) => {
            const f = accountForm(bank.id);
            return (
              <div key={bank.id} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{bank.name}</h3>
                  <button
                    type="button"
                    onClick={() => handleDeleteBank(bank.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="py-2 pr-2 font-medium">Compte</th>
                        <th className="py-2 pr-2 font-medium">N°</th>
                        <th className="py-2 pr-2 font-medium text-right">Ouverture</th>
                        <th className="py-2 pr-2 font-medium text-right">Solde</th>
                        <th className="py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {bank.accounts.map((a) => (
                        <tr key={a.id} className="border-b border-slate-50">
                          <td className="py-2 pr-2 font-medium text-slate-900">{a.name}</td>
                          <td className="py-2 pr-2 text-slate-500">{a.account_number || "—"}</td>
                          <td className="py-2 pr-2 text-right text-slate-600">{money(a.opening_balance)}</td>
                          <td className="py-2 pr-2 text-right font-semibold">{money(a.balance)}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(a.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Suppr.
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bank.accounts.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-3 text-center text-slate-400">
                            Aucun compte
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <form
                  onSubmit={(e) => handleCreateAccount(e, bank.id)}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end pt-2 border-t border-slate-100"
                >
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Compte</label>
                    <input
                      value={f.name}
                      onChange={(e) =>
                        setAccountForms((prev) => ({
                          ...prev,
                          [bank.id]: { ...f, name: e.target.value },
                        }))
                      }
                      className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">N° compte</label>
                    <input
                      value={f.account_number}
                      onChange={(e) =>
                        setAccountForms((prev) => ({
                          ...prev,
                          [bank.id]: { ...f, account_number: e.target.value },
                        }))
                      }
                      className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Montant initial</label>
                    <input
                      type="number"
                      step="0.01"
                      value={f.opening_balance}
                      onChange={(e) =>
                        setAccountForms((prev) => ({
                          ...prev,
                          [bank.id]: { ...f, opening_balance: e.target.value },
                        }))
                      }
                      className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={savingAccount === bank.id}
                    className="app-btn-secondary text-sm disabled:opacity-60"
                  >
                    {savingAccount === bank.id ? "..." : "Ajouter compte"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
