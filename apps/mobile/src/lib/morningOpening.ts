export const MORNING_WEEKDAYS = [
  { index: 1, label: 'Lundi' },
  { index: 2, label: 'Mardi' },
  { index: 3, label: 'Mercredi' },
  { index: 4, label: 'Jeudi' },
  { index: 5, label: 'Vendredi' },
] as const;

export const WEEKDAY_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

export const MORNING_OPENING_LEVELS = [
  'PRESCOLAIRE',
  'FONDAMENTAL_1',
  'FONDAMENTAL_2',
] as const;

export const MORNING_PRIMAIRE_LEVELS = ['FONDAMENTAL_1', 'FONDAMENTAL_2'] as const;

export type MorningCycle = 'PRESCOLAIRE' | 'PRIMAIRE';

export function morningCycleFromLevel(level?: string | null): MorningCycle | null {
  const key = (level ?? '').toUpperCase().trim();
  if (key === 'PRESCOLAIRE') return 'PRESCOLAIRE';
  if (key === 'FONDAMENTAL_1' || key === 'FONDAMENTAL_2') return 'PRIMAIRE';
  return null;
}

export function isMorningOpeningLevel(level?: string | null): boolean {
  return !!level && (MORNING_OPENING_LEVELS as readonly string[]).includes(level);
}

export type MorningDuty = {
  id?: string;
  kind: string;
  cycle?: string | null;
  day_of_week: number;
  class_id?: string | null;
  class_name?: string | null;
  responsible_user_id?: number | null;
  responsible_name?: string | null;
  title?: string;
};

export type DayMorningProgram = {
  flagClassId: string;
  preschoolIds: number[];
  primaryIds: number[];
};

export function emptyDayProgram(): DayMorningProgram {
  return { flagClassId: '', preschoolIds: [], primaryIds: [] };
}

export function emptyWeekProgram(): Record<number, DayMorningProgram> {
  return {
    1: emptyDayProgram(),
    2: emptyDayProgram(),
    3: emptyDayProgram(),
    4: emptyDayProgram(),
    5: emptyDayProgram(),
  };
}

export function programFromDuties(duties: MorningDuty[]): Record<number, DayMorningProgram> {
  const next = emptyWeekProgram();
  for (const d of duties) {
    const slot = next[d.day_of_week];
    if (!slot) continue;
    const kind = (d.kind || '').toUpperCase();
    if (kind === 'FLAG' && d.class_id) {
      slot.flagClassId = d.class_id;
    } else if (kind === 'RENTREE' && d.responsible_user_id != null) {
      if (d.cycle === 'PRESCOLAIRE') {
        if (!slot.preschoolIds.includes(d.responsible_user_id)) {
          slot.preschoolIds.push(d.responsible_user_id);
        }
      } else if (!slot.primaryIds.includes(d.responsible_user_id)) {
        slot.primaryIds.push(d.responsible_user_id);
      }
    } else if (kind === 'DEVOTION' && d.responsible_user_id != null) {
      if (!slot.primaryIds.includes(d.responsible_user_id)) {
        slot.primaryIds.push(d.responsible_user_id);
      }
    }
  }
  return next;
}

export function dutyDisplayTitle(d: MorningDuty): string {
  const kind = (d.kind || '').toUpperCase();
  if (kind === 'FLAG') return 'Montée du drapeau';
  if (kind === 'RENTREE' && d.cycle === 'PRESCOLAIRE') return 'Rentrée préscolaire';
  if (kind === 'RENTREE') return 'Rentrée primaire';
  return d.title || kind;
}

export function dutiesForStudent(
  duties: MorningDuty[],
  classId?: string | null,
  level?: string | null,
): MorningDuty[] {
  const cycle = morningCycleFromLevel(level);
  return duties.filter((d) => {
    const kind = (d.kind || '').toUpperCase();
    if (kind === 'FLAG') return !!classId && d.class_id === classId;
    if (kind === 'RENTREE') return !!cycle && d.cycle === cycle;
    return false;
  });
}

export function dutiesForTeacher(
  duties: MorningDuty[],
  userId?: number | null,
  classIds: string[] = [],
): MorningDuty[] {
  return duties.filter((d) => {
    const kind = (d.kind || '').toUpperCase();
    if (kind === 'FLAG') return !!d.class_id && classIds.includes(d.class_id);
    if (kind === 'RENTREE') return userId != null && d.responsible_user_id === userId;
    return false;
  });
}

export function uniqueTeachersFromAssignments(
  assignments: { teacher_id?: number; teacher_name?: string; class_id: string }[],
  classIds: Set<string>,
): { id: number; name: string }[] {
  const map = new Map<number, string>();
  for (const a of assignments) {
    if (!classIds.has(a.class_id) || a.teacher_id == null) continue;
    if (!map.has(a.teacher_id)) {
      map.set(a.teacher_id, a.teacher_name?.trim() || `#${a.teacher_id}`);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function weekdayLabel(index: number): string {
  return WEEKDAY_LABELS[index] ?? `Jour ${index}`;
}

export function tomorrowWeekdayIndex(now = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return d.getDay();
}

export function namesJoin(names: string[]): string {
  const list = names.filter(Boolean);
  if (list.length === 0) return '—';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} et ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}
