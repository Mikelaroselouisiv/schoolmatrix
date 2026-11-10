import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LoginThrottle } from './login-throttle.entity';
import {
  applyLoginFailure,
  emptyLoginLockState,
  retryAfterSeconds,
  type LoginLockState,
} from './login-lock';

const MINUTE = 60_000;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export type LoginFailureResult =
  | { kind: 'ok'; remainingAttempts: number }
  | { kind: 'locked'; retryAfterSeconds: number; stage: number }
  | { kind: 'blocked' };

/**
 * Limitation des tentatives de connexion, persistée en base.
 *
 * Indexée sur l'IDENTIFIANT saisi, pas sur l'IP : le front WordPress appelle
 * l'API depuis une seule IP serveur.
 *
 * Échelle par identifiant (3 essais par palier) :
 *   1 min → 5 min → 1 h → 6 h → blocage du compte.
 *
 * Un second compteur par IP, beaucoup plus large (LOGIN_MAX_FAILURES_PER_IP=0
 * pour désactiver), freine le balayage multi-comptes sans minuterie échelonnée.
 */
@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger(LoginThrottleService.name);
  private readonly maxFailuresPerIp = envInt('LOGIN_MAX_FAILURES_PER_IP', 60);
  private readonly ipLockMs = envInt('LOGIN_IP_LOCK_MINUTES', 15) * MINUTE;

  constructor(
    @InjectRepository(LoginThrottle)
    private readonly repo: Repository<LoginThrottle>,
  ) {}

  /** À appeler AVANT de vérifier le mot de passe. Lève 429 / 403 si bloqué. */
  async assertAllowed(login: string, ip?: string): Promise<void> {
    await this.assertLoginBucket(this.key(login));
    if (ip && this.maxFailuresPerIp > 0) {
      await this.assertIpBucket(this.ipKey(ip));
    }
  }

  /** Identifiants refusés. */
  async recordFailure(login: string, ip?: string): Promise<LoginFailureResult> {
    if (ip && this.maxFailuresPerIp > 0) {
      await this.bumpIp(this.ipKey(ip));
    }
    return this.bumpLogin(this.key(login));
  }

  /** Mot de passe correct : on repart de zéro. */
  async recordSuccess(login: string, ip?: string): Promise<void> {
    await this.repo.delete({ identifier: this.key(login) });
    if (ip) await this.repo.delete({ identifier: this.ipKey(ip) });
  }

  /** Réactivation admin : le titulaire peut se reconnecter. */
  async clearForUser(email?: string | null, phone?: string | null): Promise<void> {
    const ids = [email, phone]
      .filter((v): v is string => !!v && v.trim() !== '')
      .map((v) => this.key(v));
    if (!ids.length) return;
    await this.repo.delete({ identifier: In(ids) });
  }

  private key(login: string): string {
    return login.trim().toLowerCase();
  }

  private ipKey(ip: string): string {
    return `ip:${ip.trim()}`;
  }

  private toState(row: LoginThrottle | null): LoginLockState {
    if (!row) return emptyLoginLockState();
    return {
      stage: row.stage,
      failures_in_stage: row.failures_in_stage,
      locked_until: row.locked_until,
      permanently_blocked: row.permanently_blocked,
    };
  }

  private async save(identifier: string, state: LoginLockState): Promise<void> {
    await this.repo.save({
      identifier,
      stage: state.stage,
      failures_in_stage: state.failures_in_stage,
      locked_until: state.locked_until,
      permanently_blocked: state.permanently_blocked,
    });
  }

  denyLocked(retryAfter: number, stage: number): never {
    this.throwLocked(retryAfter, stage);
  }

  denyBlocked(): never {
    this.throwBlocked();
  }

  private throwLocked(retryAfter: number, stage: number): never {
    throw new HttpException(
      {
        message: `Trop de tentatives de connexion. Réessayez dans ${formatLockHint(retryAfter)}.`,
        error: 'Too Many Requests',
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        retry_after_seconds: retryAfter,
        lock_stage: stage,
        permanently_blocked: false,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private throwBlocked(): never {
    throw new HttpException(
      {
        message:
          "Compte bloqué après trop de tentatives. Contactez l'administration de l'école.",
        error: 'Forbidden',
        statusCode: HttpStatus.FORBIDDEN,
        retry_after_seconds: 0,
        permanently_blocked: true,
      },
      HttpStatus.FORBIDDEN,
    );
  }

  private async assertLoginBucket(identifier: string): Promise<void> {
    const row = await this.repo.findOne({ where: { identifier } });
    if (!row) return;
    if (row.permanently_blocked) this.throwBlocked();
    const now = new Date();
    if (row.locked_until && row.locked_until.getTime() > now.getTime()) {
      this.throwLocked(retryAfterSeconds(row.locked_until, now), row.stage);
    }
  }

  private async assertIpBucket(identifier: string): Promise<void> {
    const row = await this.repo.findOne({ where: { identifier } });
    if (!row) return;
    const now = new Date();
    if (row.locked_until && row.locked_until.getTime() > now.getTime()) {
      this.throwLocked(retryAfterSeconds(row.locked_until, now), row.stage);
    }
  }

  private async bumpLogin(identifier: string): Promise<LoginFailureResult> {
    const row = await this.repo.findOne({ where: { identifier } });
    const now = new Date();
    if (row?.permanently_blocked) return { kind: 'blocked' };
    if (row?.locked_until && row.locked_until.getTime() > now.getTime()) {
      return {
        kind: 'locked',
        retryAfterSeconds: retryAfterSeconds(row.locked_until, now),
        stage: row.stage,
      };
    }

    const { next, event } = applyLoginFailure(this.toState(row), now);
    await this.save(identifier, next);
    if (event.kind === 'blocked') {
      this.logger.warn(`Compte bloqué (trop de connexions) pour « ${identifier} ».`);
      return { kind: 'blocked' };
    }
    if (event.kind === 'locked') {
      this.logger.warn(
        `Connexions verrouillées ${Math.round(event.lockMs / MINUTE)} min pour « ${identifier} » (palier ${event.stage}).`,
      );
      return {
        kind: 'locked',
        retryAfterSeconds: event.retryAfterSeconds,
        stage: event.stage,
      };
    }
    return { kind: 'ok', remainingAttempts: event.remainingAttempts };
  }

  private async bumpIp(identifier: string): Promise<void> {
    const now = new Date();
    const row = await this.repo.findOne({ where: { identifier } });
    if (row?.locked_until && row.locked_until.getTime() > now.getTime()) return;
    const failures = (row?.failures_in_stage ?? 0) + 1;
    if (failures >= this.maxFailuresPerIp) {
      await this.save(identifier, {
        stage: 0,
        failures_in_stage: 0,
        locked_until: new Date(now.getTime() + this.ipLockMs),
        permanently_blocked: false,
      });
      this.logger.warn(
        `Connexions bloquées ${this.ipLockMs / MINUTE} min pour ${identifier}.`,
      );
      return;
    }
    await this.save(identifier, {
      stage: 0,
      failures_in_stage: failures,
      locked_until: null,
      permanently_blocked: false,
    });
  }
}

function formatLockHint(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.ceil(seconds / 3600);
    return h <= 1 ? '1 heure' : `${h} heures`;
  }
  if (seconds >= 60) {
    const m = Math.ceil(seconds / 60);
    return m <= 1 ? '1 minute' : `${m} minutes`;
  }
  return seconds <= 1 ? '1 seconde' : `${seconds} secondes`;
}
