import {
  Member,
  ProfessionRef,
  CategoryRef,
  FormationRef,
  FonctionRef,
  ActivityLogItem,
  UserRole
} from '../types';
import {
  initialMembers,
  initialProfessions,
  initialCategories,
  initialFormations,
  initialFonctions,
  initialActivityLogs
} from '../data/mockData';

const STORAGE_KEYS = {
  MEMBERS: 'dahirah_members_v1',
  PROFESSIONS: 'dahirah_professions_v1',
  CATEGORIES: 'dahirah_categories_v1',
  FORMATIONS: 'dahirah_formations_v1',
  FONCTIONS: 'dahirah_fonctions_v1',
  LOGS: 'dahirah_logs_v1',
  AUTH: 'dahirah_auth_session'
};

const API_BASE = '/api/v1';

// Helper to safely access localStorage with fallback
function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
  } catch {
    // ignore
  }
  return fallback;
}

function setLocalItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

// Initialize local cache if not set
if (typeof window !== 'undefined') {
  if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
    setLocalItem(STORAGE_KEYS.MEMBERS, initialMembers);
  }
  if (!localStorage.getItem(STORAGE_KEYS.PROFESSIONS)) {
    setLocalItem(STORAGE_KEYS.PROFESSIONS, initialProfessions);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    setLocalItem(STORAGE_KEYS.CATEGORIES, initialCategories);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FORMATIONS)) {
    setLocalItem(STORAGE_KEYS.FORMATIONS, initialFormations);
  }
  if (!localStorage.getItem(STORAGE_KEYS.FONCTIONS)) {
    setLocalItem(STORAGE_KEYS.FONCTIONS, initialFonctions);
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    setLocalItem(STORAGE_KEYS.LOGS, initialActivityLogs);
  }
}

export const api = {
  // Members API
  async getMembers(): Promise<Member[]> {
    try {
      const res = await fetch(`${API_BASE}/members/`);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.MEMBERS, data);
        return data;
      }
    } catch {
      // fallback to cached data
    }
    return getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
  },

  async getMemberById(id: string): Promise<Member | null> {
    try {
      const res = await fetch(`${API_BASE}/members/${id}/`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    const members = getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
    return members.find((m) => m.id === id) || null;
  },

  async createMember(payload: Partial<Member>): Promise<Member> {
    let createdMember: Member | null = null;
    try {
      const res = await fetch(`${API_BASE}/members/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        createdMember = await res.json();
      }
    } catch {
      // fallback
    }

    if (!createdMember) {
      const members = getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
      const newMatricule = `MUT-2026-${String(members.length + 1).padStart(4, '0')}`;
      createdMember = {
        id: `m-${Date.now()}`,
        matricule: newMatricule,
        prenom: payload.prenom || 'Nouveau',
        nom: payload.nom || 'Membre',
        sexe: payload.sexe || 'M',
        dateNaissance: payload.dateNaissance,
        lieuNaissance: payload.lieuNaissance,
        telephone: payload.telephone,
        email: payload.email,
        adresse: payload.adresse,
        ville: payload.ville || 'Dakar',
        pays: payload.pays || 'Sénégal',
        situation: payload.situation || 'SALARIE',
        professions: payload.professions || [],
        formations: payload.formations || [],
        activites: payload.activites || [],
        fonctionsDahirah: payload.fonctionsDahirah || [],
        privacy: payload.privacy || {
          showPhone: 'MEMBRES',
          showEmail: 'MEMBRES',
          showAddress: 'ADMIN_ONLY',
          showProfessions: 'PUBLIC',
          showFormations: 'MEMBRES',
        },
        dataQualityIssues: payload.dataQualityIssues,
        dateInscription: new Date().toISOString().split('T')[0],
        statutCompte: 'ACTIF'
      };
      const updated = [createdMember, ...members];
      setLocalItem(STORAGE_KEYS.MEMBERS, updated);
    } else {
      const members = getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
      setLocalItem(STORAGE_KEYS.MEMBERS, [createdMember, ...members.filter((m) => m.id !== createdMember!.id)]);
    }

    return createdMember;
  },

  async updateMember(id: string, payload: Partial<Member>): Promise<Member> {
    let updatedMember: Member | null = null;
    try {
      const res = await fetch(`${API_BASE}/members/${id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        updatedMember = await res.json();
      }
    } catch {
      // fallback
    }

    const members = getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
    const existing = members.find((m) => m.id === id);
    if (existing) {
      updatedMember = { ...existing, ...payload } as Member;
      const updatedList = members.map((m) => (m.id === id ? updatedMember! : m));
      setLocalItem(STORAGE_KEYS.MEMBERS, updatedList);
    }

    return updatedMember || (payload as Member);
  },

  async deleteMember(id: string): Promise<boolean> {
    try {
      await fetch(`${API_BASE}/members/${id}/`, { method: 'DELETE' });
    } catch {
      // fallback
    }
    const members = getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
    const filtered = members.filter((m) => m.id !== id);
    setLocalItem(STORAGE_KEYS.MEMBERS, filtered);
    return true;
  },

  // Taxonomies
  async getProfessions(): Promise<ProfessionRef[]> {
    try {
      const res = await fetch(`${API_BASE}/taxonomies/professions/`);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.PROFESSIONS, data);
        return data;
      }
    } catch {
      // fallback
    }
    return getLocalItem<ProfessionRef[]>(STORAGE_KEYS.PROFESSIONS, initialProfessions);
  },

  async getCategories(): Promise<CategoryRef[]> {
    try {
      const res = await fetch(`${API_BASE}/taxonomies/categories/`);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.CATEGORIES, data);
        return data;
      }
    } catch {
      // fallback
    }
    return getLocalItem<CategoryRef[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
  },

  async getFormations(): Promise<FormationRef[]> {
    try {
      const res = await fetch(`${API_BASE}/taxonomies/formations/`);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.FORMATIONS, data);
        return data;
      }
    } catch {
      // fallback
    }
    return getLocalItem<FormationRef[]>(STORAGE_KEYS.FORMATIONS, initialFormations);
  },

  async getFonctions(): Promise<FonctionRef[]> {
    try {
      const res = await fetch(`${API_BASE}/taxonomies/fonctions/`);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.FONCTIONS, data);
        return data;
      }
    } catch {
      // fallback
    }
    return getLocalItem<FonctionRef[]>(STORAGE_KEYS.FONCTIONS, initialFonctions);
  },

  // Activity Logs
  async getActivityLogs(): Promise<ActivityLogItem[]> {
    try {
      const res = await fetch(`${API_BASE}/logs/`);
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.LOGS, data);
        return data;
      }
    } catch {
      // fallback
    }
    return getLocalItem<ActivityLogItem[]>(STORAGE_KEYS.LOGS, initialActivityLogs);
  },

  async addActivityLog(log: Omit<ActivityLogItem, 'id'>): Promise<ActivityLogItem> {
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}`,
      ...log,
      timestamp: log.timestamp || 'À l’instant'
    };
    try {
      await fetch(`${API_BASE}/logs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
    } catch {
      // fallback
    }
    const current = getLocalItem<ActivityLogItem[]>(STORAGE_KEYS.LOGS, initialActivityLogs);
    setLocalItem(STORAGE_KEYS.LOGS, [newLog, ...current]);
    return newLog;
  },

  // Auth / Session
  async login(matriculeOrEmail: string, role?: UserRole): Promise<{ role: UserRole; member?: Member; token: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matriculeOrEmail, role }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalItem(STORAGE_KEYS.AUTH, data);
        return data;
      }
    } catch {
      // fallback
    }

    // Default fallback resolution
    const members = getLocalItem<Member[]>(STORAGE_KEYS.MEMBERS, initialMembers);
    const targetMember = members.find(
      (m) =>
        m.matricule.toLowerCase() === matriculeOrEmail.toLowerCase() ||
        (m.email && m.email.toLowerCase() === matriculeOrEmail.toLowerCase())
    );

    const resolvedRole: UserRole = role || (targetMember ? 'MEMBER' : 'PUBLIC');
    const authData = {
      role: resolvedRole,
      member: targetMember,
      token: `tok-${Date.now()}`
    };
    setLocalItem(STORAGE_KEYS.AUTH, authData);
    return authData;
  }
};
