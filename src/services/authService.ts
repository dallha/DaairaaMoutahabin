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

export interface ManagedUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role: 'superadmin' | 'admin' | 'agent' | 'member';
  groups: string[];
  member_id?: string | null;
  member_matricule?: string | null;
  member_display_name?: string | null;
  date_joined: string;
  last_login?: string | null;
}

export async function fetchUsersApi(params?: { search?: string; role?: string; is_active?: boolean }): Promise<ManagedUser[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.role) query.append('role', params.role);
  if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));

  const url = `${API_BASE_URL}/auth/users/${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Impossible de récupérer la liste des utilisateurs.');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function createUserApi(payload: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  member_id?: string | null;
  is_active?: boolean;
}): Promise<ManagedUser> {
  const res = await fetch(`${API_BASE_URL}/auth/users/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      err.message ||
      (err.email ? `Email : ${err.email[0]}` : null) ||
      (err.password ? `Mot de passe : ${err.password[0]}` : null) ||
      err.detail ||
      'Échec de la création de l’utilisateur.';
    throw new Error(msg);
  }
  const data = await res.json();
  return data.data || data;
}

export async function updateUserApi(
  id: string,
  payload: {
    first_name?: string;
    last_name?: string;
    role?: string;
    is_active?: boolean;
    member_id?: string | null;
  }
): Promise<ManagedUser> {
  const res = await fetch(`${API_BASE_URL}/auth/users/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Échec de la mise à jour.');
  }
  const data = await res.json();
  return data.data || data;
}

export async function resetUserPasswordApi(id: string, newPassword: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/users/${id}/reset-password/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Échec de la réinitialisation du mot de passe.');
  }
  const data = await res.json();
  return data.message || 'Mot de passe mis à jour avec succès.';
}

export async function deleteUserApi(id: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/auth/users/${id}/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Échec de la suppression de l’utilisateur.');
  }
  const data = await res.json();
  return data.message || 'Compte utilisateur supprimé avec succès.';
}

