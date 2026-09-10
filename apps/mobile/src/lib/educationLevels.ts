export function isHigherEducationLevel(level?: string | null): boolean {
  return (level ?? '').toUpperCase().trim() === 'FORMATION_SUPERIEURE';
}

/** Formation supérieure : « étudiant » ; autres cycles : « élève ». */
export function learnerNoun(level?: string | null, plural = false): string {
  if (isHigherEducationLevel(level)) {
    return plural ? 'étudiants' : 'étudiant';
  }
  return plural ? 'élèves' : 'élève';
}

export function learnerNounCap(level?: string | null, plural = false): string {
  const n = learnerNoun(level, plural);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
