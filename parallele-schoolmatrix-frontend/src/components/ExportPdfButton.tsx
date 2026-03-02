"use client";

import { useState } from "react";
import type { PdfTableConfig, PdfSection } from "@/src/lib/pdfExport";
import { exportTableToPdf, exportSectionsToPdf } from "@/src/lib/pdfExport";

type ExportPdfButtonProps = {
  /** Export simple : un seul tableau */
  table?: PdfTableConfig;
  /** Export multi-sections (fiche, rapport) */
  sections?: PdfSection[];
  mainTitle?: string;
  filename: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Bouton global "Exporter en PDF". Utilisable sur toute page (listes, tableaux, situations).
 * Passez soit `table` (un tableau) soit `sections` + optionnel `mainTitle` pour un rapport.
 */
export function ExportPdfButton({
  table,
  sections,
  mainTitle,
  filename,
  label = "Exporter en PDF",
  className = "",
  disabled = false,
}: ExportPdfButtonProps) {
  const [loading, setLoading] = useState(false);

  const canExport = Boolean(table || (sections && sections.length > 0));

  async function handleClick() {
    if (loading || disabled || !canExport) return;
    setLoading(true);
    try {
      if (table) {
        await exportTableToPdf(table, filename);
      } else if (sections?.length) {
        await exportSectionsToPdf(sections, filename, mainTitle);
      }
    } catch (e) {
      console.error("Export PDF failed", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading || !canExport}
      className={className || "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"}
    >
      {loading ? (
        "Génération..."
      ) : (
        <>{label}</>
      )}
    </button>
  );
}
