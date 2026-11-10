import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AppUpdateControls } from '../components/AppUpdateControls';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../context/AuthContext';
import { useSchoolProfileOptional } from '../context/SchoolProfileContext';
import { LoginFailedError, lockMessage } from '../lib/loginLock';
import { getToken } from '../services/api';

export function LoginPage() {
  const { login, user, loading: authLoading } = useAuth();
  const ctx = useSchoolProfileOptional();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [permanentlyBlocked, setPermanentlyBlocked] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (permanentlyBlocked || lockUntil == null) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setLockUntil(null);
        setError('');
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [lockUntil, permanentlyBlocked]);

  const locked = permanentlyBlocked || (lockUntil != null && remaining > 0);

  if (!authLoading && (user || getToken())) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    setError('');
    setLoading(true);
    try {
      await login(loginValue, password, rememberMe);
      await ctx?.refetch?.();
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      console.error('Login API error:', err);
      if (err instanceof LoginFailedError && err.permanentlyBlocked) {
        setPermanentlyBlocked(true);
        setLockUntil(null);
        setError(lockMessage(0, true));
      } else if (err instanceof LoginFailedError && err.retryAfterSeconds > 0) {
        setLockUntil(Date.now() + err.retryAfterSeconds * 1000);
        setRemaining(err.retryAfterSeconds);
        setError(lockMessage(err.retryAfterSeconds, false));
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur de connexion. Vérifiez que le backend est démarré.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--app-bg-gradient)' }}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--app-border)] shadow-sm p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Eureka SchoolMatrix</h1>
        <p className="text-slate-600 mb-6">Connexion</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-slate-700 mb-1">
              Email ou téléphone
            </label>
            <input
              id="login"
              type="text"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
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
          {(error || locked) && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg whitespace-pre-line tabular-nums">
              {permanentlyBlocked
                ? lockMessage(0, true)
                : lockUntil != null && remaining > 0
                  ? lockMessage(remaining, false)
                  : error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || locked}
            className="app-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Connexion…'
              : locked
                ? 'Connexion indisponible'
                : 'Se connecter'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600 text-center">
          Pas encore de compte ?{' '}
          <Link to="/signup" className="font-medium text-[var(--school-accent-1)] hover:underline">
            Créer un compte
          </Link>
        </p>
        <div className="mt-6 flex justify-center">
          <AppUpdateControls variant="login" />
        </div>
      </div>
    </div>
  );
}
