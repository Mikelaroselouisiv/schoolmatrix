declare global {
  interface Window {
    schoolmatrixDesktop?: {
      edition: "server" | "remote";
      apiBase: string;
    };
  }
}

function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    const desktop = window.schoolmatrixDesktop?.apiBase?.replace(/\/$/, "");
    if (desktop) return desktop;
    return "/api";
  }
  return (
    process.env.API_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://schoolmatrix-api:3000"
  );
}

const API_BASE = resolveApiBase();

const GCS_PUBLIC_UPLOADS =
  "https://storage.googleapis.com/parallele-schoolmatrix-assets/schoolmatrix/uploads";

/**
 * URL d’image : GCS publique (Server ↔ Remote), sinon API locale.
 */
function getImageUrl(storedUrl: string | null | undefined): string | null {
  if (!storedUrl || !storedUrl.trim()) return null;
  const trimmed = storedUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const rel = trimmed.match(/^(?:\/)?uploads\/([^/?#]+)$/i);
  if (rel) return `${GCS_PUBLIC_UPLOADS}/${rel[1]}`;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (typeof window !== "undefined" && window.schoolmatrixDesktop?.apiBase) {
    const base = window.schoolmatrixDesktop.apiBase.replace(/\/$/, "");
    const uploadPath = path.startsWith("/uploads")
      ? path
      : path.startsWith("/api/")
        ? path.slice(4)
        : `/uploads${path.startsWith("/") ? path : `/${path}`}`;
    return `${base}${uploadPath.startsWith("/") ? uploadPath : `/${uploadPath}`}`;
  }
  return `/api${path}`;
}

/** Fetch avec token Bearer si disponible. */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...options, headers });
}

export { API_BASE, getImageUrl, fetchWithAuth, resolveApiBase };
