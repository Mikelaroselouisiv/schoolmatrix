"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/src/lib/api";
import { PasswordInput } from "@/src/components/PasswordInput";
import { useSchoolProfileOptional } from "@/src/contexts/SchoolProfileContext";

export default function LoginPage() {
  const router = useRouter();
  const ctx = useSchoolProfileOptional();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: login.trim() || undefined,
          email: login.trim() || undefined,
          password,
          remember_me: rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Identifiants invalides");
        return;
      }
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        await ctx?.refetch?.();
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Réponse serveur invalide");
      }
    } catch {
      setError("Erreur de connexion. Vérifiez que le backend est démarré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Connexion</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="login" className="block text-sm font-medium text-slate-700 mb-1">
            Email ou téléphone
          </label>
          <input
            id="login"
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="exemple@email.com"
            className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40 focus:border-[var(--school-accent-1)]"
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-slate-300 text-[var(--school-accent-1)] focus:ring-[var(--school-accent-1)]"
          />
          <label htmlFor="remember" className="text-sm text-slate-600">
            Se souvenir de moi
          </label>
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="app-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          <Link href="/" className="app-btn-secondary">
            Retour
          </Link>
        </div>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-[var(--school-accent-1)] hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
