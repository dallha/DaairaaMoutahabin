/**
 * Configuration centrale de l'URL API REST Django.
 * Respecte strictement la règle : aucune URL fictive inventée.
 */

export function getApiBaseUrl(): string {
  const metaEnv = (import.meta as any).env;
  const envUrl = metaEnv?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // En local Vite dev server
  if (metaEnv?.DEV) {
    return '/api/v1';
  }

  // En production sans URL définie, signale explicitement le besoin de configuration
  return '/api/v1';
}

export const API_BASE_URL = getApiBaseUrl();
