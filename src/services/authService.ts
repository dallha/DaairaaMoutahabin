/**
 * Service d'authentification connecté à Django REST Framework.
 * Gère les JWT HttpOnly cookies et les jetons CSRF pour les requêtes mutantes.
 */

import { API_BASE_URL } from './apiConfig';

export interface AuthUser {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: 'superadmin' | 'admin' | 'agent' | 'member';
  member_id?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}

function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

export async function loginApi(credentials: { email?: string; matricule?: string; password: string }): Promise<{ user: AuthUser; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    credentials: 'include',
    body: JSON.stringify({
      email: credentials.email || credentials.matricule,
      password: credentials.password,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.error || 'Échec de la connexion.');
  }

  const data = await res.json();
  return data;
}

export async function getCurrentUserApi(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.user || data;
  } catch (error) {
    console.warn('Impossible de récupérer la session courante:', error);
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Erreur lors de la déconnexion API:', error);
  }
}
