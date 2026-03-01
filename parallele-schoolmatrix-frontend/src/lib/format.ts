/**
 * Format montant en gourdes (format comptable : espaces milliers, 2 décimales, suffixe Gdes).
 */
export function formatGdes(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "— Gdes";
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Gdes`;
}

/**
 * Affiche une date au format JJ-MM-AAAA (ex: 26-02-2025).
 * Accepte YYYY-MM-DD ou ISO string.
 */
export function formatDateJJMMAAAA(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return dateStr;
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
}

/**
 * Convertit JJ-MM-AAAA en YYYY-MM-DD pour les APIs / input type="date".
 */
export function parseJJMMAAAAToIso(jjMmAaaa: string): string | null {
  const trimmed = jjMmAaaa.trim();
  const match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  const dd = d.padStart(2, "0");
  const mm = m.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
