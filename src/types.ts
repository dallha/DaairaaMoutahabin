export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'PUBLIC';
export type BackendRole = 'superadmin' | 'admin' | 'agent' | 'member';

export type Language = 'fr' | 'ar' | 'en' | 'FR' | 'AR' | 'EN';

export type Gender = 'M' | 'F' | 'NON_PRECISE';

export type SituationType =
  | 'ELEVE'
  | 'ETUDIANT'
  | 'SALARIE'
  | 'ENTREPRENEUR'
  | 'INDEPENDANT'
  | 'SANS_EMPLOI'
  | 'RETRAITE'
  | 'AUTRE';

export interface Formation {
  id: string;
  domaine: string;
  niveau: string; // e.g. Bac, Licence, Master, Doctorat, BTS, CQP, Coranique/Daara
  etablissement: string;
  diplome: string;
  annee?: string;
}

export interface Profession {
  id: string;
  metier: string;
  secteur: string;
  activite: string;
  isPrincipale?: boolean;
}

export interface FonctionDahirah {
  id: string;
  role: string; // Membre, Zakir, Responsable Pôle, Membre du Bureau, Trésorier, etc.
  pole?: string; // Pôle Spirituel, Pôle Organisation, Pôle Éducation, etc.
  dateNomination?: string;
  isActif: boolean;
}

export type VisibilityLevel = 'PUBLIC' | 'MEMBRES' | 'ADMIN_ONLY';

export interface PrivacySettings {
  showPhone: VisibilityLevel;
  showEmail: VisibilityLevel;
  showAddress: VisibilityLevel;
  showProfessions: VisibilityLevel;
  showFormations: VisibilityLevel;
}

export interface Member {
  id: string;
  matricule: string;
  prenom: string;
  nom: string;
  nomArabe?: string;
  photo?: string;
  sexe: Gender;
  dateNaissance?: string;
  lieuNaissance?: string;
  telephone?: string;
  telephoneSecondaire?: string;
  email?: string;
  ville: string;
  pays: string;
  adresse?: string;
  situation: SituationType;
  professionActuelle?: string;
  formations: Formation[];
  professions: Profession[];
  activites: string[];
  fonctionsDahirah: FonctionDahirah[];
  privacy: PrivacySettings;
  dateInscription: string;
  statutCompte: 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE';
  notesInternes?: string;
  dataQualityIssues?: string[]; // E.g. "Numéro de téléphone manquant", "Nom incomplet"
  isFounder?: boolean;
  institutionalPriority?: number;
  institutionalRoleName?: string;
}

export interface ProfessionRef {
  id: string;
  metier: string;
  nom?: string;
  categorieId: string;
  categorieNom?: string;
  description: string;
  statut: 'ACTIF' | 'INACTIF';
  isActif?: boolean;
  nbMembres?: number;
}

export interface CategoryRef {
  id: string;
  nom: string;
  code: string;
  iconName: string;
  description: string;
  isActif?: boolean;
  nbMembres?: number;
}

export interface FormationRef {
  id: string;
  domaine: string;
  nom?: string;
  niveau?: string;
  niveaux: string[];
  description: string;
  isActif?: boolean;
}

export interface FonctionRef {
  id: string;
  titre: string;
  nom?: string;
  code: string;
  pole: string;
  description: string;
  rang: number;
  isActif?: boolean;
}

export interface ActivityLog {
  id: string;
  utilisateurNom?: string;
  userName?: string;
  userId?: string;
  utilisateurRole?: UserRole;
  action: string;
  objetConcerne?: string;
  date?: string;
  timestamp?: string;
  statut?: 'SUCCESS' | 'WARNING' | 'ERROR';
  details?: string;
}

export type ActivityLogItem = ActivityLog;

export interface UserAccount {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  role: UserRole;
  statut: 'ACTIF' | 'SUSPENDU';
  derniereConnexion: string;
  membreAssocieId?: string;
}

export interface CommunityEvent {
  id: string;
  titre: string;
  type: 'HADARA' | 'WAZIFA' | 'CONF' | 'ZIYARA' | 'REUNION';
  date: string;
  lieu: string;
  description: string;
  nbInscrits: number;
  statut: 'A_VENIR' | 'EN_COURS' | 'TERMINE';
}

export interface ContributionRecord {
  id: string;
  membreId: string;
  membreNom: string;
  type: 'ADHESION' | 'TAYSIR' | 'SOLIDARITE' | 'EVENEMENT';
  montant: number;
  datePaiement: string;
  statut: 'PAYE' | 'EN_ATTENTE' | 'RETARD';
  recuNumero: string;
}

export interface PermissionDefinition {
  id: string;
  code: string;
  nom: string;
  description: string;
  categorie: 'MEMBRES' | 'TAXONOMIES' | 'ADMINISTRATION' | 'COMMUNAUTE';
}

export type RolePermissionsConfig = Record<UserRole, Record<string, boolean>>;

export type NeedType =
  | 'MENTORSHIP'
  | 'INTERNSHIP'
  | 'JOB_SEARCH'
  | 'PRO_SERVICE'
  | 'LEGAL_ADMIN'
  | 'ACADEMIC'
  | 'COMMUNITY_AID'
  | 'OTHER';

export type NeedUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL';

export type NeedStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'EXPIRED' | 'CANCELLED';

export type NeedVisibility = 'PUBLIC' | 'INTERNAL' | 'RESTRICTED_ADMIN';

export interface MemberNeed {
  id: string;
  member: string;
  memberName?: string;
  memberMatricule?: string;
  needType: NeedType;
  needTypeDisplay?: string;
  title: string;
  description: string;
  urgencyLevel: NeedUrgency;
  urgencyLevelDisplay?: string;
  status: NeedStatus;
  statusDisplay?: string;
  visibilityLevel: NeedVisibility;
  visibilityLevelDisplay?: string;
  isAnonymous: boolean;
  expiresAt?: string;
  resolvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}


