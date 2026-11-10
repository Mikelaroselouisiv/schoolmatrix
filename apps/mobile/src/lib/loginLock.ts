export class LoginFailedError extends Error {
  retryAfterSeconds: number;
  permanentlyBlocked: boolean;

  constructor(
    message: string,
    retryAfterSeconds = 0,
    permanentlyBlocked = false,
  ) {
    super(message);
    this.name = 'LoginFailedError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.permanentlyBlocked = permanentlyBlocked;
  }
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h} h ${pad(m)} min ${pad(sec)} s`;
  if (m > 0) return `${m} min ${pad(sec)} s`;
  return `${sec} s`;
}

export function lockMessage(
  remainingSeconds: number,
  permanentlyBlocked: boolean,
): string {
  if (permanentlyBlocked) {
    return "Compte bloqué après trop de tentatives. Contactez l'administration de l'école.";
  }
  return `Trop de tentatives de connexion.\nRéessayez dans ${formatCountdown(remainingSeconds)}.`;
}
