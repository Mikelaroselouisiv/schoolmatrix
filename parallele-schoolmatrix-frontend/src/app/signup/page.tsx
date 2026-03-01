"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/src/lib/api";
import { PasswordInput } from "@/src/components/PasswordInput";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Erreur lors de l'inscription");
        return;
      }
      setMessage("Premier administrateur créé. Vous pouvez maintenant vous connecter.");
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch {
      setError("Erreur de connexion. Vérifiez que le backend est démarré.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Créer un compte</h2>
      <p className="text-sm text-slate-600 mb-4">
        Si c&apos;est la première utilisation, créez le compte administrateur principal.
        Sinon, contactez un administrateur pour créer votre compte.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40 focus:border-[var(--school-accent-1)]"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Téléphone (optionnel)
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+243..."
            className="w-full border border-[var(--app-border)] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--school-accent-1)]/40 focus:border-[var(--school-accent-1)]"
            autoComplete="tel"
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
            autoComplete="new-password"
            required
          />
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        {message && (
          <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            {message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="app-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Création..." : "Créer le compte"}
          </button>
          <Link href="/" className="app-btn-secondary">
            Retour
          </Link>
        </div>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-[var(--school-accent-1)] hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
