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

function normalizeAuthUser(user: any): AuthUser {
  if (!user) return user;
  let role = user.role;
  if (!role || !['superadmin', 'admin', 'agent', 'member'].includes(role)) {
    if (user.is_superuser || (Array.isArray(user.groups) && user.groups.some((g: string) => g.toLowerCase().includes('super')))) {
      role = 'superadmin';
    } else if (user.is_staff || (Array.isArray(user.groups) && user.groups.some((g: string) => g.toLowerCase().includes('admin')))) {
      role = 'admin';
    } else if (Array.isArray(user.groups) && user.groups.some((g: string) => g.toLowerCase().includes('agent'))) {
      role = 'agent';
    } else {
      role = 'member';
    }
  }

  return {
    ...user,
    role,
  };
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('dahirah_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  const csrf = getCsrfToken();
  if (csrf) {
    headers['X-CSRFToken'] = csrf;
  }
  return headers;
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
  if (data.access && typeof window !== 'undefined') {
    sessionStorage.setItem('dahirah_access_token', data.access);
  }

  const rawUser = data.user || data;
  return {
    ...data,
    user: normalizeAuthUser(rawUser),
  };
}

export async function getCurrentUserApi(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me/`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const rawUser = data.user || data;
    return normalizeAuthUser(rawUser);
  } catch (error) {
    console.warn('Impossible de récupérer la session courante:', error);
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('dahirah_access_token');
  }

  try {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Erreur lors de la déconnexion API:', error);
  }
}
