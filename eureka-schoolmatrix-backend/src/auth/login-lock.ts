const MINUTE = 60_000;

/** 3 échecs → 1 min ; 3 de plus → 5 min ; puis 1 h ; 6 h ; puis blocage compte. */
export const LOGIN_ATTEMPTS_PER_STAGE = 3;

export const LOGIN_LOCK_MS = [
  1 * MINUTE,
  5 * MINUTE,
  60 * MINUTE,
  6 * 60 * MINUTE,
] as const;

export const LOGIN_LAST_ATTEMPT_STAGE = LOGIN_LOCK_MS.length;

export type LoginLockState = {
  stage: number;
  failures_in_stage: number;
  locked_until: Date | null;
  permanently_blocked: boolean;
};

export type LoginLockEvent =
  | { kind: 'ok'; remainingAttempts: number }
  | { kind: 'locked'; retryAfterSeconds: number; stage: number; lockMs: number }
  | { kind: 'blocked' };

export function emptyLoginLockState(): LoginLockState {
  return {
    stage: 0,
    failures_in_stage: 0,
    locked_until: null,
    permanently_blocked: false,
  };
}

export function applyLoginFailure(
  prev: LoginLockState,
  now: Date,
): { next: LoginLockState; event: LoginLockEvent } {
  if (prev.permanently_blocked) {
    return { next: prev, event: { kind: 'blocked' } };
  }

  const failures = prev.failures_in_stage + 1;
  if (failures < LOGIN_ATTEMPTS_PER_STAGE) {
    return {
      next: { ...prev, failures_in_stage: failures, locked_until: null },
      event: {
        kind: 'ok',
        remainingAttempts: LOGIN_ATTEMPTS_PER_STAGE - failures,
      },
    };
  }

  if (prev.stage >= LOGIN_LAST_ATTEMPT_STAGE) {
    return {
      next: {
        ...prev,
        failures_in_stage: 0,
        locked_until: null,
        permanently_blocked: true,
      },
      event: { kind: 'blocked' },
    };
  }

  const lockMs = LOGIN_LOCK_MS[prev.stage];
  return {
    next: {
      stage: prev.stage + 1,
      failures_in_stage: 0,
      locked_until: new Date(now.getTime() + lockMs),
      permanently_blocked: false,
    },
    event: {
      kind: 'locked',
      retryAfterSeconds: Math.ceil(lockMs / 1000),
      stage: prev.stage + 1,
      lockMs,
    },
  };
}

export function retryAfterSeconds(lockedUntil: Date | null, now: Date): number {
  if (!lockedUntil) return 0;
  return Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000));
}
