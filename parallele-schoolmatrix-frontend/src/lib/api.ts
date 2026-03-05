// Navigateur : NEXT_PUBLIC_API_URL. Serveur (SSR dans le conteneur) : API_INTERNAL_URL.
const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000")
    : (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");

/**
 * Retourne l'URL complète pour afficher une image stockée dans le projet (dossier uploads).
 * @param storedUrl - Valeur en base : "uploads/xxx.jpg" ou "/uploads/xxx.jpg" ou URL absolue
 */
function getImageUrl(storedUrl: string | null | undefined): string | null {
  if (!storedUrl || !storedUrl.trim()) return null;
  const trimmed = storedUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const base =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000")
      : (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");
  return `${base.replace(/\/$/, "")}${path}`;
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

export { API_BASE, getImageUrl, fetchWithAuth };
