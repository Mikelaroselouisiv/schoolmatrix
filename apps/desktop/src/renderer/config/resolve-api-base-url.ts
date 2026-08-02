import { getAppEdition } from './edition';
import { LOCAL_API_BASE_URL, PUBLIC_API_BASE_URL } from './public-api';

/**
 * Server → 127.0.0.1:3000.
 * Remote → URL GCP publique.
 * Priorité : VITE_API_URL → preload apiBase → édition.
 */
export async function resolveApiBaseUrl(): Promise<string> {
  const override = import.meta.env.VITE_API_URL?.trim();
  if (override) return override.replace(/\/$/, '');

  const fromDesktop = window.schoolmatrixDesktop?.apiBase?.trim();
  if (fromDesktop) return fromDesktop.replace(/\/$/, '');

  if (getAppEdition() === 'server') {
    return LOCAL_API_BASE_URL;
  }

  return PUBLIC_API_BASE_URL;
}
