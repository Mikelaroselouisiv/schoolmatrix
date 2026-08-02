import { useCallback, useEffect, useState } from 'react';
import type {
  DesktopUpdaterPromptPayload,
  DesktopUpdaterSnoozeOption,
  DesktopUpdaterState,
} from '../types/updater';

const IDLE_STATE: DesktopUpdaterState = {
  status: 'disabled',
  currentVersion: '—',
  availableVersion: null,
  progress: null,
  lastCheckedAt: null,
  error: null,
  snoozeUntil: null,
  enabled: false,
  edition: 'remote',
};

function statusLabel(state: DesktopUpdaterState): string {
  switch (state.status) {
    case 'checking':
      return 'Vérification…';
    case 'available':
      return state.availableVersion
        ? `Mise à jour ${state.availableVersion}`
        : 'Mise à jour disponible';
    case 'downloading':
      return state.progress != null
        ? `Téléchargement ${Math.round(state.progress)} %`
        : 'Téléchargement…';
    case 'downloaded':
      return 'Prête à installer';
    case 'up-to-date':
      return 'À jour';
    case 'error':
      return 'Erreur de mise à jour';
    case 'disabled':
      return 'Mises à jour (installateur)';
    default:
      return 'Mises à jour';
  }
}

export function AppUpdateControls({
  variant = 'header',
}: {
  variant?: 'header' | 'login';
}) {
  const updater =
    typeof window !== 'undefined' ? window.schoolmatrixDesktop?.updater : undefined;
  const [state, setState] = useState<DesktopUpdaterState>(IDLE_STATE);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snoozeOptions, setSnoozeOptions] = useState<DesktopUpdaterSnoozeOption[]>([]);
  const [promptReason, setPromptReason] = useState<DesktopUpdaterPromptPayload['reason']>();

  useEffect(() => {
    if (!updater) return;

    void updater.getState().then(setState).catch(() => undefined);
    void updater
      .getSnoozeOptions()
      .then(setSnoozeOptions)
      .catch(() => undefined);

    const offState = updater.onState(setState);
    const offPrompt = updater.onOpenPrompt((payload) => {
      setPromptReason(payload?.reason);
      setOpen(true);
    });
    const offMenu = updater.onMenuCheck?.(() => {
      setPromptReason(undefined);
      setOpen(true);
      void updater.check().then(setState).catch(() => undefined);
    });
    return () => {
      offState();
      offPrompt();
      offMenu?.();
    };
  }, [updater]);

  const run = useCallback(
    async (action: () => Promise<DesktopUpdaterState | { ok: boolean; error?: string }>) => {
      if (!updater) return;
      setBusy(true);
      try {
        const next = await action();
        if (next && 'status' in next) setState(next);
      } finally {
        setBusy(false);
      }
    },
    [updater],
  );

  if (!updater) return null;

  const hasUpdate =
    state.status === 'available' ||
    state.status === 'downloading' ||
    state.status === 'downloaded';

  const buttonLabel = hasUpdate
    ? 'Mettre à jour'
    : variant === 'login'
      ? `v${state.currentVersion} · Mise à jour`
      : `v${state.currentVersion}`;

  return (
    <>
      <button
        type="button"
        className={[
          'relative text-xs py-1.5 px-2.5 rounded border transition-colors',
          hasUpdate
            ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
            : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        ].join(' ')}
        onClick={() => {
          setPromptReason(undefined);
          setOpen(true);
          if (state.enabled && (state.status === 'idle' || state.status === 'up-to-date')) {
            void run(() => updater.check());
          }
        }}
        title={statusLabel(state)}
      >
        {hasUpdate ? (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500"
            aria-hidden
          />
        ) : null}
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-update-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="app-update-title" className="text-lg font-semibold text-slate-900">
                Mises à jour logicielles
              </h2>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <p>
                Version installée : <strong>{state.currentVersion}</strong>
                {state.edition ? (
                  <>
                    {' '}
                    · Édition{' '}
                    <strong>{state.edition === 'server' ? 'Server' : 'Remote'}</strong>
                  </>
                ) : null}
              </p>

              {!state.enabled ? (
                <p className="text-slate-500">
                  Les mises à jour en ligne fonctionnent dans l’application installée, pas en mode
                  développement.
                </p>
              ) : (
                <p className="text-slate-500">
                  Télécharge la dernière version publiée pour cette édition, puis redémarre pour
                  l’installer.
                </p>
              )}

              {promptReason === 'reminder' ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                  Rappel : une mise à jour est toujours disponible.
                </p>
              ) : null}

              {state.status === 'available' && state.availableVersion ? (
                <p>
                  La version <strong>{state.availableVersion}</strong> est disponible.
                </p>
              ) : null}

              {state.status === 'downloading' ? (
                <div>
                  <div className="mb-1 text-slate-600">
                    Téléchargement
                    {state.progress != null ? ` — ${Math.round(state.progress)} %` : '…'}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-800 transition-all"
                      style={{ width: `${Math.max(2, state.progress ?? 5)}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {state.status === 'downloaded' && state.availableVersion ? (
                <p>
                  La version <strong>{state.availableVersion}</strong> est téléchargée. Redémarrez
                  pour l’installer.
                </p>
              ) : null}

              {state.status === 'up-to-date' ? (
                <p>Vous êtes à jour. Aucune nouvelle version pour le moment.</p>
              ) : null}

              {state.status === 'checking' ? <p>Vérification en cours…</p> : null}

              {state.status === 'error' && state.error ? (
                <p className="text-red-600">{state.error}</p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {state.enabled ? (
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={busy || state.status === 'checking' || state.status === 'downloading'}
                  onClick={() => void run(() => updater.check())}
                >
                  Vérifier les mises à jour
                </button>
              ) : null}

              {state.status === 'available' ? (
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void run(() => updater.download())}
                >
                  Télécharger et préparer
                </button>
              ) : null}

              {state.status === 'downloaded' ? (
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void run(() => updater.install())}
                >
                  Redémarrer et installer
                </button>
              ) : null}

              {state.status === 'available' || state.status === 'downloaded' ? (
                <div className="pt-1">
                  <p className="mb-1.5 text-xs text-slate-500">Rappeler…</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(snoozeOptions.length
                      ? snoozeOptions
                      : [
                          { id: '1h', label: 'Dans 1 heure' },
                          { id: '4h', label: 'Dans 4 heures' },
                          { id: '1d', label: 'Demain' },
                          { id: '7d', label: 'Dans 1 semaine' },
                        ]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          void run(() => updater.snooze(opt.id));
                          setOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {state.status === 'available' ? (
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => {
                    void run(() => updater.dismiss());
                    setOpen(false);
                  }}
                >
                  Plus tard (4 h)
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
