"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/src/lib/api";
import { PasswordInput } from "@/src/components/PasswordInput";

type User = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  active: boolean;
};

type Role = { id: number; name: string };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [first_name, setFirst_name] = useState("");
  const [last_name, setLast_name] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleName, setRoleName] = useState("PARENT");
  const [saving, setSaving] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPwd, setResettingPwd] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/users`),
        fetchWithAuth(`${API_BASE}/roles`),
      ]);
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      if (!usersRes.ok) throw new Error(usersData.message || "Erreur");
      setUsers(usersData.users ?? []);
      setRoles(rolesData.roles ?? []);
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
      if (editing) {
        const body: Record<string, unknown> = { first_name: first_name.trim() || undefined, last_name: last_name.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined };
        if (password) body.password = password;
        const res = await fetchWithAuth(`${API_BASE}/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      } else {
        const res = await fetchWithAuth(`${API_BASE}/users`, {
          method: "POST",
          body: JSON.stringify({ first_name: first_name.trim() || undefined, last_name: last_name.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined, password, roleName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Erreur");
      }
      setShowForm(false);
      setEditing(null);
      setFirst_name("");
      setLast_name("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRoleName("PARENT");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetRole(id: number, newRole: string) {
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ roleName: newRole }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwdUser || !newPassword.trim() || newPassword.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setResettingPwd(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${resetPwdUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setResetPwdUser(null);
      setNewPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setResettingPwd(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE}/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erreur");
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  function openEdit(u: User) {
    setEditing(u);
    setFirst_name(u.first_name ?? "");
    setLast_name(u.last_name ?? "");
    setEmail(u.email);
    setPhone(u.phone ?? "");
    setPassword("");
    setRoleName(u.role ?? "PARENT");
    setShowForm(true);
  }

  function openCreate() {
    setEditing(null);
    setFirst_name("");
    setLast_name("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRoleName("PARENT");
    setShowForm(true);
  }

  if (loading) return <div className="animate-pulse text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Gestion des utilisateurs</h2>
        <button onClick={openCreate} className="app-btn-primary">Ajouter un utilisateur</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-[var(--app-border)] bg-white space-y-4 max-w-lg">
          <h3 className="font-semibold text-slate-900">{editing ? "Modifier" : "Nouvel utilisateur"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prenom</label>
              <input type="text" value={first_name} onChange={(e) => setFirst_name(e.target.value)} className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
              <input type="text" value={last_name} onChange={(e) => setLast_name(e.target.value)} className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!editing} className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40 disabled:bg-slate-50 disabled:text-slate-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telephone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe {editing && "(vide = ne pas changer)"} {!editing && "(min. 6 caractères)"}</label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required={!editing} minLength={editing ? undefined : 6} autoComplete="new-password" />
          </div>
          {!editing && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={roleName} onChange={(e) => setRoleName(e.target.value)} className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40">
                {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="app-btn-primary disabled:opacity-60">{saving ? "Enregistrement..." : "Enregistrer"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="app-btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {resetPwdUser && (
        <form onSubmit={handleResetPassword} className="p-5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-4 max-w-md">
          <h3 className="font-semibold text-slate-900">Réinitialiser le mot de passe</h3>
          <p className="text-sm text-slate-600">Utilisateur : {resetPwdUser.first_name} {resetPwdUser.last_name} ({resetPwdUser.email})</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nouveau mot de passe (min. 6 caractères)</label>
            <PasswordInput value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="Nouveau mot de passe" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={resettingPwd || newPassword.trim().length < 6} className="app-btn-primary disabled:opacity-60">{resettingPwd ? "Enregistrement..." : "Enregistrer"}</button>
            <button type="button" onClick={() => { setResetPwdUser(null); setNewPassword(""); setError(""); }} className="app-btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {error && !showForm && !resetPwdUser && <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-[var(--app-border)]">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-900">Nom</th>
              <th className="px-4 py-3 font-medium text-slate-900">Email</th>
              <th className="px-4 py-3 font-medium text-slate-900">Telephone</th>
              <th className="px-4 py-3 font-medium text-slate-900">Role</th>
              <th className="px-4 py-3 font-medium text-slate-900 w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucun utilisateur</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--app-border)] hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{(u.first_name || "") + " " + (u.last_name || "").trim() || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{u.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <select value={u.role ?? ""} onChange={(e) => handleSetRole(u.id, e.target.value)} className="text-sm border border-[var(--app-border)] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--school-accent-1)]">
                      {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 flex gap-2 flex-wrap">
                    <button onClick={() => openEdit(u)} className="text-sm text-[var(--school-accent-1)] hover:underline">Modifier</button>
                    <button onClick={() => { setResetPwdUser(u); setNewPassword(""); setError(""); }} className="text-sm text-amber-600 hover:underline">Réinitialiser le mot de passe</button>
                    <button onClick={() => handleDelete(u.id)} className="text-sm text-red-600 hover:underline">Supprimer</button>
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
