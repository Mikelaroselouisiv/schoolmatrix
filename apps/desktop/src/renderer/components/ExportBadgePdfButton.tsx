import { useState } from "react";
import { PdfPreviewModal } from "@/components/PdfPreviewModal";

type ExportBadgePdfButtonProps = {
  filename: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Construit le blob PDF (badge(s)). */
  getBlob: () => Promise<Blob>;
};

/**
 * Bouton de production de badge(s) PDF avec aperçu / téléchargement / impression.
 */
export function ExportBadgePdfButton({
  filename,
  label = "Produire le badge",
  className = "",
  disabled = false,
  getBlob,
}: ExportBadgePdfButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  async function handleClick() {
    if (loading || disabled) return;
    setLoading(true);
    setError("");
    setPdfBlob(null);
    try {
      const blob = await getBlob();
      setPdfBlob(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de génération");
      console.error("Badge PDF failed", e);
    } finally {
      setLoading(false);
    }
  }

  const safeFilename = filename.replace(/\.pdf$/i, "") + ".pdf";

  return (
    <>
      <div className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || loading}
          className={
            className ||
            "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--school-accent-1)] text-[var(--school-accent-1)] hover:bg-[var(--school-accent-1)]/10 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          }
        >
          {loading ? "Génération..." : label}
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      {pdfBlob && (
        <PdfPreviewModal
          blob={pdfBlob}
          filename={safeFilename}
          onClose={() => setPdfBlob(null)}
        />
      )}
    </>
  );
}
