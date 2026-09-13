/**
 * Service pour le Réseau, les Compétences et l'Entraide Communautaire (/network).
 * Connecté aux endpoints REST Django de l'application apps.network.
 */

import { API_BASE_URL } from './apiConfig';
import { getAuthHeaders } from './authService';

const API_BASE = `${API_BASE_URL}/network`;

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  display_order: number;
}

export interface Skill {
  id: string;
  category: string;
  category_name?: string;
  name: string;
  slug: string;
  is_active: boolean;
}

export interface MemberSkill {
  id: string;
  member: string;
  skill: string;
  skill_name: string;
  category_name?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  level_display: string;
  years_experience?: number | null;
  is_verified: boolean;
  verified_by?: string | null;
  verified_by_email?: string | null;
  verified_at?: string | null;
  created_at?: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

export interface MemberServiceOffer {
  id: string;
  member: string;
  service: string;
  service_name: string;
  title: string;
  description: string;
  service_type: 'VOLUNTEER' | 'DAHIRAH_RATE' | 'STANDARD' | 'MENTORSHIP';
  service_type_display: string;
  terms?: string | null;
  contact_mode: 'INTERNAL_MESSAGE' | 'WHATSAPP' | 'PHONE' | 'OTHER';
  contact_mode_display: string;
  is_active: boolean;
  created_at: string;
}

export interface MemberAvailability {
  id?: string;
  member: string;
  status: 'NOT_SPECIFIED' | 'AVAILABLE' | 'LIMITED' | 'BUSY' | 'UNAVAILABLE';
  status_display?: string;
  open_for_mentoring: boolean;
  open_for_dahirah_events: boolean;
  open_for_pro_help: boolean;
  open_for_volunteer: boolean;
  weekly_hours_available?: number | null;
  preferred_contact_method?: string;
  notes?: string | null;
  updated_at?: string;
}

export interface MemberRelation {
  id: string;
  from_member: string;
  from_member_name: string;
  from_member_matricule: string;
  to_member: string;
  to_member_name: string;
  to_member_matricule: string;
  relation_type: 'SPONSOR' | 'MENTOR' | 'COLLABORATOR' | 'FRATERNAL';
  relation_type_display: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  status_display: string;
  approved_by?: string | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface NetworkMemberCard {
  id: string;
  matricule: string;
  first_name: string;
  last_name: string;
  display_name: string;
  gender: string;
  situation: string;
  city: string;
  primary_profession?: string | null;
  primary_organization?: string | null;
  skills: Array<{
    id: string;
    name: string;
    level: string;
    level_display: string;
    is_verified: boolean;
  }>;
  services_count: number;
  availability_status: string;
  open_for_mentoring: boolean;
  open_for_pro_help: boolean;
}

// ----------------------------------------------------------------------
// Référentiels
// ----------------------------------------------------------------------

export async function getSkillCategories(): Promise<SkillCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/skill-categories/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export async function getSkills(categorySlug?: string, search?: string): Promise<Skill[]> {
  try {
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (search) params.set('search', search);
    const url = `${API_BASE}/skills/?${params.toString()}`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export async function getServicesCatalog(): Promise<ServiceCatalogItem[]> {
  try {
    const res = await fetch(`${API_BASE}/services-catalog/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------
// Profil Membre (Sous-ressources)
// ----------------------------------------------------------------------

export async function getMemberSkills(memberIdOrMatricule: string): Promise<MemberSkill[]> {
  try {
    const res = await fetch(`${API_BASE}/member-skills/?member=${encodeURIComponent(memberIdOrMatricule)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export async function addMemberSkill(payload: {
  member: string;
  skill: string;
  level: string;
  years_experience?: number;
}): Promise<MemberSkill> {
  const res = await fetch(`${API_BASE}/member-skills/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.non_field_errors?.[0] || 'Erreur lors de l’ajout de la compétence');
  }
  return res.json();
}

export async function deleteMemberSkill(skillAssociationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/member-skills/${skillAssociationId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erreur lors du retrait de la compétence');
}

export async function verifyMemberSkill(skillAssociationId: string): Promise<MemberSkill> {
  const res = await fetch(`${API_BASE}/member-skills/${skillAssociationId}/verify/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erreur lors de la validation administrative de la compétence');
  return res.json();
}

export async function getMemberServices(memberIdOrMatricule: string): Promise<MemberServiceOffer[]> {
  try {
    const res = await fetch(`${API_BASE}/member-services/?member=${encodeURIComponent(memberIdOrMatricule)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export async function addMemberService(payload: {
  member: string;
  service: string;
  title: string;
  description: string;
  service_type: string;
  terms?: string;
  contact_mode: string;
}): Promise<MemberServiceOffer> {
  const res = await fetch(`${API_BASE}/member-services/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Erreur lors de la publication du service');
  }
  return res.json();
}

export async function deleteMemberService(serviceId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/member-services/${serviceId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erreur lors du retrait du service');
}

export async function getMemberAvailability(memberIdOrMatricule: string): Promise<MemberAvailability | null> {
  try {
    const res = await fetch(`${API_BASE}/member-availability/?member=${encodeURIComponent(memberIdOrMatricule)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.results || [];
    return list[0] || null;
  } catch {
    return null;
  }
}

export async function saveMemberAvailability(
  availabilityId: string | undefined,
  payload: Partial<MemberAvailability>
): Promise<MemberAvailability> {
  const method = availabilityId ? 'PATCH' : 'POST';
  const url = availabilityId ? `${API_BASE}/member-availability/${availabilityId}/` : `${API_BASE}/member-availability/`;

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur lors de la mise à jour de la disponibilité');
  return res.json();
}

export async function getMemberRelations(memberIdOrMatricule: string): Promise<MemberRelation[]> {
  try {
    const res = await fetch(`${API_BASE}/member-relations/?member=${encodeURIComponent(memberIdOrMatricule)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch {
    return [];
  }
}

export async function declareMemberRelation(payload: {
  from_member: string;
  to_member: string;
  relation_type: string;
  notes?: string;
}): Promise<MemberRelation> {
  const res = await fetch(`${API_BASE}/member-relations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.non_field_errors?.[0] || 'Erreur lors de la déclaration du lien relationnel');
  }
  return res.json();
}

export async function approveMemberRelation(relationId: string): Promise<MemberRelation> {
  const res = await fetch(`${API_BASE}/member-relations/${relationId}/approve/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Erreur lors de l’approbation de la relation');
  return res.json();
}

// ----------------------------------------------------------------------
// Carrefour Professionnel & Entraide (/network) Discovery Search
// ----------------------------------------------------------------------

export interface NetworkSearchParams {
  sector?: string;
  profession?: string;
  skill?: string;
  service_type?: string;
  city?: string;
  availability?: string;
  mentoring?: boolean;
  pro_help?: boolean;
  search?: string;
}

export async function searchNetwork(params: NetworkSearchParams): Promise<{
  count: number;
  results: NetworkMemberCard[];
}> {
  try {
    const q = new URLSearchParams();
    if (params.sector) q.set('sector', params.sector);
    if (params.profession) q.set('profession', params.profession);
    if (params.skill) q.set('skill', params.skill);
    if (params.service_type) q.set('service_type', params.service_type);
    if (params.city) q.set('city', params.city);
    if (params.availability) q.set('availability', params.availability);
    if (params.mentoring) q.set('mentoring', 'true');
    if (params.pro_help) q.set('pro_help', 'true');
    if (params.search) q.set('search', params.search);

    const res = await fetch(`${API_BASE}/discovery/?${q.toString()}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return { count: 0, results: [] };
    return res.json();
  } catch {
    return { count: 0, results: [] };
  }
}
