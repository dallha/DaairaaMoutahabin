/**
 * Service de gestion des membres connecté à l'API REST Django / PostgreSQL Neon.
 * Remplace l'ancien connecteur Firestore en conservant l'interface attendue par les composants React.
 */

import { Member, SituationType, Formation, Profession, FonctionDahirah } from '../types';
import { API_BASE_URL } from './apiConfig';
import { getAuthHeaders } from './authService';

const API_BASE = API_BASE_URL;

const SITUATION_TO_FRONTEND: Record<string, SituationType> = {
  PUPIL: 'ELEVE',
  STUDENT: 'ETUDIANT',
  EMPLOYEE: 'SALARIE',
  ENTREPRENEUR: 'ENTREPRENEUR',
  FREELANCE: 'INDEPENDANT',
  RETIRED: 'RETRAITE',
  JOB_SEEKER: 'SANS_EMPLOI',
  OTHER: 'AUTRE',
};

const SITUATION_TO_BACKEND: Record<string, string> = {
  ELEVE: 'PUPIL',
  ETUDIANT: 'STUDENT',
  SALARIE: 'EMPLOYEE',
  ENTREPRENEUR: 'ENTREPRENEUR',
  INDEPENDANT: 'FREELANCE',
  RETRAITE: 'RETIRED',
  SANS_EMPLOI: 'JOB_SEEKER',
  AUTRE: 'OTHER',
};

export function transformDjangoMember(item: any): Member {
  const contacts = item.contacts || [];
  const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0] || {};
  const secondaryContact = contacts.find((c: any) => !c.is_primary) || null;

  return {
    id: String(item.id),
    matricule: item.matricule || `DAMF-${item.id?.slice(0, 8)}`,
    prenom: item.first_name || '',
    nom: item.last_name || '',
    nomArabe: item.arabic_name || '',
    photo: item.photo || undefined,
    sexe: item.gender === 'F' ? 'F' : 'M',
    dateNaissance: item.birth_date || undefined,
    lieuNaissance: item.birth_place || undefined,
    telephone: primaryContact.phone || undefined,
    telephoneSecondaire: secondaryContact ? secondaryContact.phone : undefined,
    email: primaryContact.email || item.email || undefined,
    ville: primaryContact.city || 'Dakar',
    pays: primaryContact.country || 'Sénégal',
    adresse: primaryContact.address || undefined,
    situation: (SITUATION_TO_FRONTEND[item.situation] || 'AUTRE') as SituationType,
    formations: (item.educations || []).map((e: any): Formation => ({
      id: String(e.id),
      domaine: e.field || '',
      niveau: e.level_display || e.level || '',
      etablissement: e.institution || '',
      diplome: e.diploma || '',
      annee: e.start_year ? String(e.start_year) : undefined
    })),
    professions: (item.professions || []).map((p: any): Profession => ({
      id: String(p.id),
      metier: p.profession_name || p.title || '',
      secteur: p.category_name || '',
      activite: p.organization || '',
      isPrincipale: p.is_primary ?? true
    })),
    activites: [],
    fonctionsDahirah: (item.dairah_roles || []).map((r: any): FonctionDahirah => ({
      id: String(r.id),
      role: r.role_name || '',
      pole: r.role_category_display || r.notes || '',
      dateNomination: r.start_date || undefined,
      isActif: r.is_current ?? true
    })),
    privacy: {
      showPhone: primaryContact.phone_visible_to_members ? 'MEMBRES' : 'ADMIN_ONLY',
      showEmail: 'MEMBRES',
      showAddress: 'ADMIN_ONLY',
      showProfessions: 'PUBLIC',
      showFormations: 'MEMBRES',
    },
    dateInscription: item.joined_at || new Date().toISOString().split('T')[0],
    statutCompte: item.status === 'SUSPENDED' ? 'SUSPENDU' : 'ACTIF',
    notesInternes: item.notes || undefined,
    dataQualityIssues: []
  };
}

export async function getMembers(
  pageSize: number = 50,
  page: number = 1,
  situation?: string
): Promise<{ members: Member[]; totalCount: number }> {
  try {
    let url = `${API_BASE}/members/?page_size=${pageSize}&page=${page}`;
    if (situation) {
      url += `&situation=${encodeURIComponent(situation)}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Erreur API ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    const rawList = Array.isArray(json) ? json : (json.results || []);
    const members = rawList.map(transformDjangoMember);
    return {
      members,
      totalCount: json.count || members.length,
    };
  } catch (error) {
    console.error('Erreur getMembers REST:', error);
    return { members: [], totalCount: 0 };
  }
}

export async function searchMembers(searchTerm: string): Promise<Member[]> {
  try {
    const res = await fetch(`${API_BASE}/members/?search=${encodeURIComponent(searchTerm)}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Erreur recherche ${res.status}`);
    const json = await res.json();
    const rawList = Array.isArray(json) ? json : (json.results || []);
    return rawList.map(transformDjangoMember);
  } catch (error) {
    console.error('Erreur searchMembers REST:', error);
    return [];
  }
}

export async function getMemberById(id: string): Promise<Member | null> {
  try {
    const res = await fetch(`${API_BASE}/members/${id}/`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data || json;
    return transformDjangoMember(data);
  } catch (error) {
    console.error('Erreur getMemberById REST:', error);
    return null;
  }
}

export async function addMember(member: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const payload = {
    first_name: member.prenom,
    last_name: member.nom,
    gender: member.sexe,
    birth_date: member.dateNaissance || null,
    situation: SITUATION_TO_BACKEND[member.situation] || 'OTHER',
    phone: member.telephone,
    phone_visible_to_members: member.privacy?.showPhone === 'MEMBRES',
    email: member.email,
    city: member.ville || 'Dakar',
    country: member.pays || 'Sénégal',
    address: member.adresse,
  };

  const res = await fetch(`${API_BASE}/members/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || `Erreur création membre : ${res.status}`);
  }

  const json = await res.json();
  const created = json.data || json;
  return String(created.matricule || created.id);
}

export async function updateMember(id: string, member: Partial<Member>): Promise<void> {
  const payload: Record<string, any> = {};
  if (member.prenom) payload.first_name = member.prenom;
  if (member.nom) payload.last_name = member.nom;
  if (member.sexe) payload.gender = member.sexe;
  if (member.dateNaissance !== undefined) payload.birth_date = member.dateNaissance;
  if (member.situation) payload.situation = SITUATION_TO_BACKEND[member.situation] || member.situation;
  if (member.notesInternes !== undefined) payload.notes = member.notesInternes;

  const res = await fetch(`${API_BASE}/members/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || errData.message || `Erreur mise à jour membre : ${res.status}`);
  }
}

export async function deleteMember(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${id}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!res.ok && res.status !== 204 && res.status !== 200) {
    throw new Error(`Erreur suppression membre : ${res.status}`);
  }
}

export async function restoreMember(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${id}/restore/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Impossible de restaurer le membre.');
  }
}

export async function hardDeleteMember(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/members/${id}/hard_delete/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ confirm_hard_delete: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || 'Impossible de supprimer définitivement le membre.');
  }
}

