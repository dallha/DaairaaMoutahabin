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
  intent?: 'MENTORSHIP' | 'SERVICE' | 'PRO_HELP' | 'JOB_INTERNSHIP';
  available_only?: boolean;
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
    if (params.intent) q.set('intent', params.intent);
    if (params.available_only) q.set('available_only', 'true');
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

// ----------------------------------------------------------------------
// Besoins & Demandes d'Entraide (MemberNeed)
// ----------------------------------------------------------------------

export interface MemberNeedDTO {
  id: string;
  member: string;
  member_name?: string;
  member_matricule?: string;
  need_type: string;
  need_type_display?: string;
  title: string;
  description: string;
  urgency_level: 'NORMAL' | 'HIGH' | 'CRITICAL';
  urgency_level_display?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'EXPIRED' | 'CANCELLED';
  status_display?: string;
  visibility_level: 'PUBLIC' | 'INTERNAL' | 'RESTRICTED_ADMIN';
  visibility_level_display?: string;
  is_anonymous: boolean;
  expires_at?: string | null;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function fetchMemberNeeds(memberIdOrMatricule?: string): Promise<MemberNeedDTO[]> {
  try {
    const url = memberIdOrMatricule
      ? `${API_BASE}/member-needs/?member=${encodeURIComponent(memberIdOrMatricule)}`
      : `${API_BASE}/member-needs/`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

export async function createMemberNeed(data: Partial<MemberNeedDTO>): Promise<MemberNeedDTO | null> {
  try {
    const res = await fetch(`${API_BASE}/member-needs/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function resolveMemberNeed(needId: string): Promise<MemberNeedDTO | null> {
  try {
    const res = await fetch(`${API_BASE}/member-needs/${needId}/resolve/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------
// Matching Explicable & Demandes de Mise en Relation (ConnectionRequest)
// ----------------------------------------------------------------------

export interface NeedMatchCandidateDTO {
  member_id: string;
  matricule: string;
  display_name: string;
  gender: string;
  city: string;
  primary_profession?: string | null;
  score: number;
  match_reasons: string[];
  availability_status: string;
  open_for_mentoring: boolean;
}

export interface ConnectionRequestDTO {
  id: string;
  need?: string;
  need_title?: string;
  need_type?: string;
  need_type_display?: string;
  requester?: string;
  requester_name: string;
  requester_matricule?: string;
  facilitator?: string;
  facilitator_email?: string;
  target_member: string;
  target_member_name: string;
  target_member_matricule: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  status_display: string;
  message?: string;
  resulting_relation?: string;
  resulting_relation_id?: string;
  created_at: string;
  responded_at?: string | null;
}

export async function fetchNeedMatches(needId: string): Promise<NeedMatchCandidateDTO[]> {
  try {
    const res = await fetch(`${API_BASE}/member-needs/${needId}/matches/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function fetchConnectionRequests(params?: {
  status?: string;
  need?: string;
}): Promise<ConnectionRequestDTO[]> {
  try {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.need) q.set('need', params.need);
    const url = `${API_BASE}/connection-requests/?${q.toString()}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

export async function createConnectionRequest(data: {
  need?: string;
  target_member: string;
  message?: string;
}): Promise<ConnectionRequestDTO | null> {
  try {
    const res = await fetch(`${API_BASE}/connection-requests/`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Erreur lors de l’envoi de la demande de mise en relation.');
    }
    return res.json();
  } catch (e: any) {
    throw e;
  }
}

export async function acceptConnectionRequest(requestId: string): Promise<ConnectionRequestDTO> {
  const res = await fetch(`${API_BASE}/connection-requests/${requestId}/accept/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Impossible d’accepter cette demande.');
  }
  return res.json();
}

export async function declineConnectionRequest(requestId: string): Promise<ConnectionRequestDTO> {
  const res = await fetch(`${API_BASE}/connection-requests/${requestId}/decline/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Impossible de décliner cette demande.');
  }
  return res.json();
}


