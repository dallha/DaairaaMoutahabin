import { PermissionDefinition, RolePermissionsConfig, UserRole, UserAccount } from '../types';
import { initialUserAccounts } from './mockData';

export const PERMISSION_CATEGORIES = [
  { id: 'MEMBRES', label: 'Gestion des Membres & Registre', icon: 'Users' },
  { id: 'TAXONOMIES', label: 'Référentiels Métiers & Formations', icon: 'Briefcase' },
  { id: 'ADMINISTRATION', label: 'Gouvernance, Audit & Sécurité', icon: 'ShieldCheck' },
  { id: 'COMMUNAUTE', label: 'Vie Communautaire & Espace Disciple', icon: 'Heart' },
] as const;

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. Gestion des Membres
  {
    id: 'perm-1',
    code: 'members.view_directory',
    nom: 'Consulter l’annuaire communautaire',
    description: 'Accéder à la liste des disciples inscrits et aux filtres professionnels.',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-2',
    code: 'members.view_contact_info',
    nom: 'Afficher les coordonnées protégées',
    description: 'Voir les numéros de téléphone personnels et adresses selon les règles de visibilité.',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-3',
    code: 'members.create',
    nom: 'Inscrire un nouveau membre',
    description: 'Accéder à l’assistant d’inscription et générer un nouveau matricule officiel.',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-4',
    code: 'members.edit_all',
    nom: 'Modifier toutes les fiches de membres',
    description: 'Mettre à jour les informations d’identité, professions et cursus de tout disciple.',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-5',
    code: 'members.delete',
    nom: 'Supprimer définitivement un membre',
    description: 'Action irréversible supprimant une fiche et archivant son historique d’audit.',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-6',
    code: 'members.resolve_alerts',
    nom: 'Traiter les alertes qualité des données',
    description: 'Certifier les données incomplètes (téléphone, nom de famille manquant, etc.).',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-7',
    code: 'members.import_csv',
    nom: 'Importation massive Excel / CSV',
    description: 'Téléverser des fichiers de recensement avec détection des doublons.',
    categorie: 'MEMBRES',
  },
  {
    id: 'perm-8',
    code: 'members.export_data',
    nom: 'Exportation complète des données',
    description: 'Générer des exports Excel, CSV et carnets de contacts VCard.',
    categorie: 'MEMBRES',
  },

  // 2. Référentiels Métiers & Taxonomies
  {
    id: 'perm-9',
    code: 'taxonomies.view',
    nom: 'Consulter les nomenclatures',
    description: 'Visualiser les listes normalisées des métiers, catégories, formations et fonctions.',
    categorie: 'TAXONOMIES',
  },
  {
    id: 'perm-10',
    code: 'taxonomies.create',
    nom: 'Créer de nouvelles entrées référentiels',
    description: 'Ajouter un métier, une catégorie socioprofessionnelle ou un pôle de fonction.',
    categorie: 'TAXONOMIES',
  },
  {
    id: 'perm-11',
    code: 'taxonomies.edit',
    nom: 'Modifier les référentiels existants',
    description: 'Corriger les libellés, codes de classification et descriptions de compétences.',
    categorie: 'TAXONOMIES',
  },
  {
    id: 'perm-12',
    code: 'taxonomies.delete',
    nom: 'Désactiver ou archiver un référentiel',
    description: 'Rendre inactive une dénomination sans impacter l’historique des membres.',
    categorie: 'TAXONOMIES',
  },

  // 3. Administration, Audit & Sécurité
  {
    id: 'perm-13',
    code: 'admin.view_dashboard',
    nom: 'Accéder au tableau de bord administrateur',
    description: 'Visualiser les statistiques avancées, ratios démographiques et dynamiques d’inscription.',
    categorie: 'ADMINISTRATION',
  },
  {
    id: 'perm-14',
    code: 'admin.manage_roles',
    nom: 'Configurer la matrice des rôles et permissions',
    description: 'Habiliter ou restreindre les accès granulaires pour chaque niveau d’utilisateur.',
    categorie: 'ADMINISTRATION',
  },
  {
    id: 'perm-15',
    code: 'admin.manage_users',
    nom: 'Gérer les comptes d’accès utilisateurs',
    description: 'Créer des gestionnaires, assigner des rôles (Admin/Membre) et suspendre des comptes.',
    categorie: 'ADMINISTRATION',
  },
  {
    id: 'perm-16',
    code: 'admin.view_audit_logs',
    nom: 'Consulter le journal d’audit et traçabilité',
    description: 'Surveiller toutes les connexions, ajouts, modifications et exports de données.',
    categorie: 'ADMINISTRATION',
  },
  {
    id: 'perm-17',
    code: 'admin.system_settings',
    nom: 'Paramètres système & clés d’intégration',
    description: 'Gérer les clés d’API, la base de données et les règles de maintenance technique.',
    categorie: 'ADMINISTRATION',
  },

  // 4. Vie Communautaire & Espace Disciple
  {
    id: 'perm-18',
    code: 'community.view_events',
    nom: 'Consulter l’agenda et Hadarat',
    description: 'Accéder au calendrier des séances de Dhikr, colloques et rassemblements spirituels.',
    categorie: 'COMMUNAUTE',
  },
  {
    id: 'perm-19',
    code: 'community.manage_events',
    nom: 'Organiser et publier des rassemblements',
    description: 'Créer des événements communautaires, gérer les inscriptions et les lieux.',
    categorie: 'COMMUNAUTE',
  },
  {
    id: 'perm-20',
    code: 'community.track_contributions',
    nom: 'Suivi des cotisations et Taysir',
    description: 'Enregistrer les contributions solidaires et éditer les reçus communautaires.',
    categorie: 'COMMUNAUTE',
  },
  {
    id: 'perm-21',
    code: 'community.edit_self_profile',
    nom: 'Mettre à jour son profil autonome',
    description: 'Modifier ses propres coordonnées, expériences et paramètres de confidentialité.',
    categorie: 'COMMUNAUTE',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
  SUPER_ADMIN: {
    'members.view_directory': true,
    'members.view_contact_info': true,
    'members.create': true,
    'members.edit_all': true,
    'members.delete': true,
    'members.resolve_alerts': true,
    'members.import_csv': true,
    'members.export_data': true,
    'taxonomies.view': true,
    'taxonomies.create': true,
    'taxonomies.edit': true,
    'taxonomies.delete': true,
    'admin.view_dashboard': true,
    'admin.manage_roles': true,
    'admin.manage_users': true,
    'admin.view_audit_logs': true,
    'admin.system_settings': true,
    'community.view_events': true,
    'community.manage_events': true,
    'community.track_contributions': true,
    'community.edit_self_profile': true,
  },
  ADMIN: {
    'members.view_directory': true,
    'members.view_contact_info': true,
    'members.create': true,
    'members.edit_all': true,
    'members.delete': false, // Seul le Super Admin peut supprimer définitivement
    'members.resolve_alerts': true,
    'members.import_csv': true,
    'members.export_data': true,
    'taxonomies.view': true,
    'taxonomies.create': true,
    'taxonomies.edit': true,
    'taxonomies.delete': false,
    'admin.view_dashboard': true,
    'admin.manage_roles': false, // Réservé au Super Admin
    'admin.manage_users': false, // Réservé au Super Admin
    'admin.view_audit_logs': true,
    'admin.system_settings': false, // Réservé au Super Admin
    'community.view_events': true,
    'community.manage_events': true,
    'community.track_contributions': true,
    'community.edit_self_profile': true,
  },
  MEMBER: {
    'members.view_directory': true,
    'members.view_contact_info': false, // Coordonnées masquées selon privacy
    'members.create': false,
    'members.edit_all': false,
    'members.delete': false,
    'members.resolve_alerts': false,
    'members.import_csv': false,
    'members.export_data': false,
    'taxonomies.view': true,
    'taxonomies.create': false,
    'taxonomies.edit': false,
    'taxonomies.delete': false,
    'admin.view_dashboard': false,
    'admin.manage_roles': false,
    'admin.manage_users': false,
    'admin.view_audit_logs': false,
    'admin.system_settings': false,
    'community.view_events': true,
    'community.manage_events': false,
    'community.track_contributions': false,
    'community.edit_self_profile': true,
  },
  PUBLIC: {
    'members.view_directory': true,
    'members.view_contact_info': false,
    'members.create': false,
    'members.edit_all': false,
    'members.delete': false,
    'members.resolve_alerts': false,
    'members.import_csv': false,
    'members.export_data': false,
    'taxonomies.view': true,
    'taxonomies.create': false,
    'taxonomies.edit': false,
    'taxonomies.delete': false,
    'admin.view_dashboard': false,
    'admin.manage_roles': false,
    'admin.manage_users': false,
    'admin.view_audit_logs': false,
    'admin.system_settings': false,
    'community.view_events': true,
    'community.manage_events': false,
    'community.track_contributions': false,
    'community.edit_self_profile': false,
  },
};

const STORAGE_KEY_PERMS = 'dahirah_role_permissions_v1';
const STORAGE_KEY_USERS = 'dahirah_user_accounts_v1';

export function getStoredRolePermissions(): RolePermissionsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with default to ensure no missing keys
      return {
        SUPER_ADMIN: { ...DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN, ...parsed.SUPER_ADMIN },
        ADMIN: { ...DEFAULT_ROLE_PERMISSIONS.ADMIN, ...parsed.ADMIN },
        MEMBER: { ...DEFAULT_ROLE_PERMISSIONS.MEMBER, ...parsed.MEMBER },
        PUBLIC: { ...DEFAULT_ROLE_PERMISSIONS.PUBLIC, ...parsed.PUBLIC },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_ROLE_PERMISSIONS;
}

export function saveStoredRolePermissions(config: RolePermissionsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_PERMS, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function getStoredUserAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return initialUserAccounts;
}

export function saveStoredUserAccounts(users: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch {
    // ignore
  }
}
