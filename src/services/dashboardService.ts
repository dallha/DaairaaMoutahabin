/**
 * Service pour la récupération des statistiques du tableau de bord.
 * Alimenté 100% dynamiquement par Django REST / PostgreSQL Neon.
 */

import { API_BASE_URL } from './apiConfig';
import { getAuthHeaders } from './authService';

export interface DashboardStats {
  metrics: {
    total_active_members: number;
    total_learners?: number;
    total_students: number;
    total_pupils?: number;
    total_professionals: number;
    total_job_seekers: number;
    total_archived_members?: number;
    total_inactive_members?: number;
    total_contacts?: number;
  };
  gender_distribution: Array<{ gender: string; count: number }>;
  situation_distribution: Array<{ situation: string; count: number }>;
  education_distribution: Array<{ level: string; count: number }>;
  top_professions: Array<{ profession__name: string; count: number }>;
  top_roles: Array<{ role__name: string; role__category?: string; count: number }>;
  recent_audit_logs?: Array<{
    id: string;
    action: string;
    entity: string;
    entity_id: string;
    user__email: string;
    created_at: string;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE_URL}/dashboard/stats/`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Impossible de charger les statistiques du tableau de bord.');
  }

  const json = await res.json();
  return json.data || json;
}
