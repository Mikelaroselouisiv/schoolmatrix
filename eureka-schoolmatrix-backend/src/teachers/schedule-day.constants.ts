import { BadRequestException } from '@nestjs/common';
import { CLASS_MOMENT_KINDS, ClassMomentKind } from './class-day-moment.entity';
import { SCHOOL_DUTY_KINDS, SchoolDutyKind } from './school-week-duty.entity';

/** Lundi → samedi (comme la grille horaire). 0 = dimanche. */
export const CLASS_WEEKDAYS = [1, 2, 3, 4, 5, 6] as const;

export const CLASS_MOMENT_LABELS: Record<ClassMomentKind, string> = {
  ENTRY: 'Rentrée',
  RECESS: 'Récréation',
  CLOSING: 'Prière de fin de journée',
};

export const SCHOOL_DUTY_LABELS: Record<SchoolDutyKind, string> = {
  DEVOTION: 'Dévotion',
};

export function parseHhMm(raw: string | undefined, field = 'horaire'): string {
  const m = String(raw ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    throw new BadRequestException(`${field} invalide (HH:MM)`);
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) {
    throw new BadRequestException(`${field} invalide (HH:MM)`);
  }
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

export function assertTimeRange(start: string, end: string): void {
  if (start >= end) {
    throw new BadRequestException('La fin doit être après le début');
  }
}

export function parseWeekday(day: number, field = 'day_of_week'): number {
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw new BadRequestException(`${field} invalide (0–6)`);
  }
  return day;
}

export function parseClassMomentKind(kind: string | undefined): ClassMomentKind {
  const k = String(kind ?? '').trim().toUpperCase();
  if (!(CLASS_MOMENT_KINDS as readonly string[]).includes(k)) {
    throw new BadRequestException(
      'Type de moment invalide (ENTRY, RECESS, CLOSING)',
    );
  }
  return k as ClassMomentKind;
}

export function parseSchoolDutyKind(kind?: string | null): SchoolDutyKind {
  const k = String(kind ?? 'DEVOTION').trim().toUpperCase();
  if (!(SCHOOL_DUTY_KINDS as readonly string[]).includes(k)) {
    throw new BadRequestException('Type de responsabilité invalide (DEVOTION)');
  }
  return k as SchoolDutyKind;
}

export function personName(
  u?: { first_name?: string | null; last_name?: string | null } | null,
): string | null {
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return name || null;
}
