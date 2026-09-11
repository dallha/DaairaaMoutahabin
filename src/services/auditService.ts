/**
 * Service d'audit connecté à l'API Django / PostgreSQL Neon.
 */

import { ActivityLogItem } from '../types';

const API_BASE = '/api/v1';

export async function getAuditLogs(): Promise<ActivityLogItem[]> {
  try {
    const res = await fetch(`${API_BASE}/audit/`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rawList = Array.isArray(json) ? json : (json.results || []);
    return rawList.map((item: any): ActivityLogItem => ({
      id: String(item.id),
      action: item.action_display || item.action,
      details: `${item.entity} (${item.entity_id})`,
      userId: item.user_email || 'Système',
      userName: item.user_email || 'Système',
      timestamp: item.created_at || 'À l’instant'
    }));
  } catch (error) {
    console.error('Erreur getAuditLogs:', error);
    return [];
  }
}

export async function addAuditLog(log: Omit<ActivityLogItem, 'id' | 'timestamp'>) {
  // L'audit sensible est automatiquement enregistré côté serveur par l'API Django.
  // Cette fonction est conservée pour la cohérence des vues frontend.
  console.log('[Audit Log Local]', log);
}
