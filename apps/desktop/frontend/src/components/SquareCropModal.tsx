"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIEW = 320;
const OUT = 900;

type SquareCropModalProps = {
  /** Object URL or data URL of the source image */
  src: string;
  title?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

/**
 * Recadrage carré avant upload (photos identité / profil).
 * Zoom + glisser pour choisir la zone ; export JPEG 900×900.
 */
export function SquareCropModal({
  src,
  title = "Recadrer en carré",
  confirmLabel = "Utiliser cette photo",
  onCancel,
  onConfirm,
}: SquareCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [busy, setBusy] = useState(false);

  const minCover = useMemo(() => {
    if (!natural) return 1;
    return Math.max(VIEW / natural.w, VIEW / natural.h);
  }, [natural]);

  const scale = minCover * zoom;

  const clampOffset = useCallback(
    (x: number, y: number, s: number) => {
      if (!natural) return { x: 0, y: 0 };
      const dispW = natural.w * s;
      const dispH = natural.h * s;
      const minX = VIEW - dispW;
      const minY = VIEW - dispH;
      return {
        x: Math.min(0, Math.max(minX, x)),
        y: Math.min(0, Math.max(minY, y)),
      };
    },
    [natural],
  );

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      setNatural({ w, h });
      const cover = Math.max(VIEW / w, VIEW / h);
      setOffset({
        x: (VIEW - w * cover) / 2,
        y: (VIEW - h * cover) / 2,
      });
      setZoom(1);
      imgRef.current = img;
    };
    img.onerror = () => onCancel();
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
    // onCancel volontairement hors deps (évite reload au re-render parent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (!natural) return;
    setOffset((o) => clampOffset(o.x, o.y, scale));
  }, [zoom, natural, scale, clampOffset]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setOffset(
      clampOffset(drag.current.origX + dx, drag.current.origY + dy, scale),
    );
  }

  function onPointerUp() {
    drag.current.active = false;
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natural) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT, OUT);
      // Zone visible VIEW×VIEW → source
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const sSize = VIEW / scale;
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92),
      );
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      onConfirm(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Déplacez et zoomez pour cadrer le visage. La photo sera enregistrée en carré.
          </p>
        </div>

        <div className="p-4 flex flex-col items-center gap-3">
          <div
            className="relative overflow-hidden rounded-lg border-2 border-slate-300 bg-slate-100 touch-none cursor-grab active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {natural && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none pointer-events-none"
                style={{
                  width: natural.w * scale,
                  height: natural.h * scale,
                  left: offset.x,
                  top: offset.y,
                }}
              />
            )}
            {/* Guides légers */}
            <div className="pointer-events-none absolute inset-0 border border-white/40" />
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/15" />
              ))}
            </div>
          </div>

          <label className="w-full flex items-center gap-3 text-sm text-slate-600">
            <span className="w-14 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-teal-700"
            />
          </label>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-50"
            onClick={onCancel}
            disabled={busy}
          >
            Annuler
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-lg bg-teal-700 text-white font-medium hover:bg-teal-800 disabled:opacity-50"
            onClick={handleConfirm}
            disabled={busy || !natural}
          >
            {busy ? "Préparation…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
