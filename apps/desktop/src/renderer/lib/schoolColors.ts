/**
 * Mélange une couleur hex avec du blanc pour obtenir une teinte pâle.
 * @param hex - Couleur au format #rgb ou #rrggbb
 * @param pctColor - Pourcentage de la couleur (0-100), le reste est du blanc. Ex: 12 = 12% couleur, 88% blanc
 */
export function mixHexWithWhite(hex: string, pctColor: number): string {
  const normalized = hex.trim().replace(/^#/, "");
  let r: number, g: number, b: number;
  if (normalized.length === 3) {
    r = parseInt(normalized[0] + normalized[0], 16);
    g = parseInt(normalized[1] + normalized[1], 16);
    b = parseInt(normalized[2] + normalized[2], 16);
  } else if (normalized.length === 6) {
    r = parseInt(normalized.slice(0, 2), 16);
    g = parseInt(normalized.slice(2, 4), 16);
    b = parseInt(normalized.slice(4, 6), 16);
  } else {
    return hex;
  }
  const pct = Math.max(0, Math.min(100, pctColor)) / 100;
  const r2 = Math.round(r * pct + 255 * (1 - pct));
  const g2 = Math.round(g * pct + 255 * (1 - pct));
  const b2 = Math.round(b * pct + 255 * (1 - pct));
  return `#${r2.toString(16).padStart(2, "0")}${g2.toString(16).padStart(2, "0")}${b2.toString(16).padStart(2, "0")}`;
}

/** Applique les couleurs de l'école sur le document (primaire, secondaire, et dégradé de fond pâle). */
export function applySchoolColors(primary: string, secondary: string, palePct = 14): void {
  if (typeof document === "undefined") return;
  const doc = document.documentElement.style;
  doc.setProperty("--school-accent-1", primary);
  doc.setProperty("--school-accent-2", secondary);
  doc.setProperty("--school-accent-1-pale", mixHexWithWhite(primary, palePct));
  doc.setProperty("--school-accent-2-pale", mixHexWithWhite(secondary, palePct));
}
