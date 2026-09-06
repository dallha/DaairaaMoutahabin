import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Eye,
  Key,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Save,
  UserPlus,
  Edit2,
  Check,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  Briefcase,
  Heart,
  Sliders,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { UserRole, Language, UserAccount, PermissionDefinition, RolePermissionsConfig } from '../types';
import { useTranslation } from '../i18n/translations';
import {
  PERMISSION_DEFINITIONS,
  PERMISSION_CATEGORIES,
  DEFAULT_ROLE_PERMISSIONS,
  getStoredRolePermissions,
  saveStoredRolePermissions,
  getStoredUserAccounts,
  saveStoredUserAccounts,
} from '../data/permissionsData';

interface UsersPermissionsViewProps {
  currentLang: Language;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  onNotify?: (msg: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onNavigate?: (view: string) => void;
  onAddAuditLog?: (action: string, details: string) => void;
}

type TabMode = 'CONFIG' | 'MATRIX' | 'USERS';

export const UsersPermissionsView: React.FC<UsersPermissionsViewProps> = ({
  currentLang,
  currentRole = 'SUPER_ADMIN',
  onRoleChange,
  onNotify,
  onNavigate,
  onAddAuditLog,
}) => {
  const t = useTranslation(currentLang);

  const [activeTab, setActiveTab] = useState<TabMode>('CONFIG');
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(getStoredRolePermissions);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Users state
  const [usersList, setUsersList] = useState<UserAccount[]>(getStoredUserAccounts);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');

  // User modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<UserAccount | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('MEMBER');
  const [formStatus, setFormStatus] = useState<'ACTIF' | 'SUSPENDU'>('ACTIF');

  // Toggle a specific permission for the selected role
  const handleTogglePermission = (role: UserRole, permCode: string) => {
    if (role === 'SUPER_ADMIN' && permCode.startsWith('admin.')) {
      // Protect super admin from locking themselves out of core admin
      if (onNotify) {
        onNotify('Les permissions d’administration système du Super Admin sont verrouillées par sécurité.', 'warning');
      }
      return;
    }

    setRolePermissions((prev) => {
      const currentVal = !!prev[role]?.[permCode];
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [permCode]: !currentVal,
        },
      };
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  // Save changes to storage
  const handleSavePermissions = () => {
    saveStoredRolePermissions(rolePermissions);
    setHasUnsavedChanges(false);
    if (onNotify) {
      onNotify('Les permissions granulaires ont été enregistrées avec succès.');
    }
    if (onAddAuditLog) {
      onAddAuditLog('Mise à jour des rôles & permissions', `Configuration modifiée pour le rôle ${selectedRole}`);
    }
  };

  // Reset to default
  const handleResetToDefaults = (role?: UserRole) => {
    if (role) {
      setRolePermissions((prev) => ({
        ...prev,
        [role]: { ...DEFAULT_ROLE_PERMISSIONS[role] },
      }));
      setHasUnsavedChanges(true);
      if (onNotify) {
        onNotify(`Les permissions du rôle ${role} ont été réinitialisées aux valeurs par défaut.`);
      }
    } else {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      saveStoredRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setHasUnsavedChanges(false);
      if (onNotify) {
        onNotify('Toutes les permissions ont été réinitialisées.');
      }
    }
  };

  // Switch session role to simulate
  const handleSimulateRole = (role: UserRole) => {
    if (onRoleChange) {
      onRoleChange(role);
      if (onNotify) {
        onNotify(`Session basculée en mode : ${role}. Vous naviguez avec les habilitations de ce rôle.`, 'info');
      }
    }
  };

  // User management modals
  const handleOpenAddUser = () => {
    setUserToEdit(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('+221 ');
    setFormRole('MEMBER');
    setFormStatus('ACTIF');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: UserAccount) => {
    setUserToEdit(user);
    setFormName(user.nom);
    setFormEmail(user.email);
    setFormPhone(user.telephone);
    setFormRole(user.role);
    setFormStatus(user.statut);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      if (onNotify) onNotify('Veuillez renseigner le nom et l’adresse email.', 'error');
      return;
    }

    if (userToEdit) {
      // Update existing
      const updated = usersList.map((u) =>
        u.id === userToEdit.id
          ? {
              ...u,
              nom: formName.trim(),
              email: formEmail.trim(),
              telephone: formPhone.trim(),
              role: formRole,
              statut: formStatus,
            }
          : u
      );
      setUsersList(updated);
      saveStoredUserAccounts(updated);
      if (onNotify) onNotify(`Compte utilisateur de ${formName} mis à jour (Rôle : ${formRole}).`);
      if (onAddAuditLog) onAddAuditLog('Modification compte utilisateur', `${formName} assigné au rôle ${formRole}`);
    } else {
      // Create new
      const newUser: UserAccount = {
        id: `u-${Date.now()}`,
        nom: formName.trim(),
        email: formEmail.trim(),
        telephone: formPhone.trim(),
        role: formRole,
        statut: formStatus,
        derniereConnexion: 'Jamais connecté',
      };
      const updated = [newUser, ...usersList];
      setUsersList(updated);
      saveStoredUserAccounts(updated);
      if (onNotify) onNotify(`Nouveau compte créé pour ${formName} avec le rôle ${formRole}.`);
      if (onAddAuditLog) onAddAuditLog('Création compte utilisateur', `${formName} créé avec rôle ${formRole}`);
    }

    setIsUserModalOpen(false);
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = usersList.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.statut === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
        if (onNotify) onNotify(`Statut de ${u.nom} changé en ${nextStatus}.`);
        if (onAddAuditLog) onAddAuditLog('Changement statut compte', `${u.nom} basculé en ${nextStatus}`);
        return { ...u, statut: nextStatus as 'ACTIF' | 'SUSPENDU' };
      }
      return u;
    });
    setUsersList(updated);
    saveStoredUserAccounts(updated);
  };

  // Filtered permissions
  const filteredPermissions = useMemo(() => {
    return PERMISSION_DEFINITIONS.filter((p) => {
      const matchCat = categoryFilter === 'ALL' || p.categorie === categoryFilter;
      const matchQuery =
        searchQuery === '' ||
        p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [categoryFilter, searchQuery]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchSearch =
        userSearch === '' ||
        u.nom.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.telephone.toLowerCase().includes(userSearch.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [usersList, userRoleFilter, userSearch]);

  // Helper count of permissions per role
  const getPermissionCount = (role: UserRole) => {
    const perms = rolePermissions[role] || {};
    return Object.values(perms).filter(Boolean).length;
  };

  // Main 3 roles descriptors
  const roleCards = [
    {
      role: 'SUPER_ADMIN' as UserRole,
      title: 'Super Administrateur',
      subtitle: 'Khalifat, Gouvernance Suprême & Direction IT',
      badgeColor: 'bg-[#816C07]/10 text-[#816C07] border-[#816C07]/30',
      activeIndicator: 'bg-[#816C07]',
      description:
        'Détient la totalité des pouvoirs opérationnels et décisionnels. Habilite les administrateurs, configure les modules critiques, consulte l’audit exhaustif et sécurise le système.',
      keyPowers: [
        'Gestion complète des rôles & permissions',
        'Création et révocation des comptes administrateurs',
        'Suppression définitive et purge de fiches',
        'Paramètres techniques, API et maintenance',
      ],
      userCount: usersList.filter((u) => u.role === 'SUPER_ADMIN').length,
    },
    {
      role: 'ADMIN' as UserRole,
      title: 'Administrateur',
      subtitle: 'Gestionnaire de Registre & Secrétariat Général',
      badgeColor: 'bg-[#335A79]/10 text-[#335A79] border-[#335A79]/30',
      activeIndicator: 'bg-[#335A79]',
      description:
        'Supervise le registre communautaire au quotidien. Enregistre les disciples, résout les alertes qualité, gère les imports/exports et enrichit les référentiels de métiers et formations.',
      keyPowers: [
        'Inscription et modification des fiches disciples',
        'Traitement des alertes de qualité des données',
        'Imports massifs CSV et exportations annuaire',
        'Édition des référentiels métiers & fonctions',
      ],
      userCount: usersList.filter((u) => u.role === 'ADMIN').length,
    },
    {
      role: 'MEMBER' as UserRole,
      title: 'Membre (Disciple)',
      subtitle: 'Membre régulier de la Dahirah',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      activeIndicator: 'bg-emerald-700',
      description:
        'Consulte le répertoire des membres selon les critères de confidentialité définis par chacun, met à jour son profil autonome, participe aux événements et suit ses contributions solidaires.',
      keyPowers: [
        'Consultation de l’annuaire communautaire',
        'Gestion autonome de son profil & vie privée',
        'Accès au calendrier des Hadarat & colloques',
        'Suivi des cotisations et reçus Taysir',
      ],
      userCount: usersList.filter((u) => u.role === 'MEMBER').length,
    },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#816C07]" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#816C07]">
              Sécurité & Habilitations RBAC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#335A79] tracking-tight mt-1">
            Gestion des Rôles & Permissions
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Définition des accès aux registres, référentiels, administration et espace disciple
          </p>
        </div>

        {/* Current Active Role Simulator Badge */}
        <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-2xl flex items-center space-x-3 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 uppercase tracking-wider block font-medium">
              Votre Rôle Actif
            </span>
            <span className="font-bold text-[#335A79]">
              {currentRole === 'SUPER_ADMIN'
                ? 'Super Administrateur'
                : currentRole === 'ADMIN'
                ? 'Administrateur'
                : 'Membre'}
            </span>
          </div>

          <div className="flex items-center space-x-1 border-l border-stone-200 pl-3">
            <button
              onClick={() => handleSimulateRole('SUPER_ADMIN')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                currentRole === 'SUPER_ADMIN'
                  ? 'bg-[#816C07] text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
              title="Tester en tant que Super Admin"
            >
              Super Admin
            </button>
            <button
              onClick={() => handleSimulateRole('ADMIN')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                currentRole === 'ADMIN'
                  ? 'bg-[#335A79] text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
              title="Tester en tant qu'Admin"
            >
              Admin
            </button>
            <button
              onClick={() => handleSimulateRole('MEMBER')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                currentRole === 'MEMBER'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
              title="Tester en tant que Membre"
            >
              Membre
            </button>
          </div>
        </div>
      </div>

      {/* Top 3 Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-2">
        <div className="inline-flex rounded-xl border border-stone-200 p-1 bg-stone-50 text-xs">
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2 ${
              activeTab === 'CONFIG'
                ? 'bg-white text-[#335A79] shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#816C07]" />
            <span>Configuration Granulaire</span>
          </button>

          <button
            onClick={() => setActiveTab('MATRIX')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2 ${
              activeTab === 'MATRIX'
                ? 'bg-white text-[#335A79] shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#335A79]" />
            <span>Matrice Comparative des Accès</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2 ${
              activeTab === 'USERS'
                ? 'bg-white text-[#335A79] shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-700" />
            <span>Comptes Utilisateurs ({usersList.length})</span>
          </button>
        </div>

        {/* Global Save button if unsaved changes */}
        {hasUnsavedChanges && (
          <div className="flex items-center space-x-2 animate-pulse">
            <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Modifications non enregistrées
            </span>
            <button
              onClick={handleSavePermissions}
              className="px-3.5 py-1.5 bg-[#816C07] hover:bg-[#6c5a06] text-white text-xs font-semibold rounded-lg shadow-2xs transition flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Sauvegarder</span>
            </button>
          </div>
        )}
      </div>

      {/* 3 Core Roles Presentation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roleCards.map((rc) => {
          const isSelected = selectedRole === rc.role;
          const activePermsCount = getPermissionCount(rc.role);

          return (
            <div
              key={rc.role}
              onClick={() => setSelectedRole(rc.role)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer relative bg-white shadow-2xs flex flex-col justify-between ${
                isSelected
                  ? 'border-[#335A79] ring-2 ring-[#335A79]/10'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              {isSelected && (
                <div className="absolute -top-2.5 right-4 bg-[#335A79] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  Rôle Sélectionné
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${rc.badgeColor}`}>
                    {rc.role}
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    {rc.userCount} compte{rc.userCount > 1 ? 's' : ''}
                  </span>
                </div>

                <h3 className="font-serif text-lg font-bold text-stone-900 mt-2.5">
                  {rc.title}
                </h3>
                <p className="text-[11px] text-[#816C07] font-medium">
                  {rc.subtitle}
                </p>

                <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                  {rc.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                  Habilitations Clés
                </p>
                <ul className="space-y-1 text-xs text-stone-700">
                  {rc.keyPowers.map((power, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <Check className="w-3 h-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] leading-tight">{power}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between text-xs pt-2 border-t border-stone-100">
                  <span className="text-[11px] text-stone-500">
                    <strong className="text-stone-900">{activePermsCount}</strong> / {PERMISSION_DEFINITIONS.length} permissions
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSimulateRole(rc.role);
                    }}
                    className="text-[11px] font-semibold text-[#335A79] hover:underline flex items-center space-x-1"
                  >
                    <span>Simuler</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: GRANULAR PERMISSIONS CONFIGURATION */}
      {/* ===================================================================== */}
      {activeTab === 'CONFIG' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          
          {/* Section Toolbar */}
          <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-base font-bold text-[#335A79] flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#816C07]" />
                <span>Configuration Granulaire pour : </span>
                <span className="text-[#816C07] font-mono font-bold">{selectedRole}</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Activez ou restreignez chaque droit d’accès individuellement.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleResetToDefaults(selectedRole)}
                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium rounded-xl shadow-2xs transition flex items-center space-x-1.5"
                title="Rétablir les permissions recommandées pour ce rôle"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                <span>Réinitialiser</span>
              </button>

              <button
                onClick={handleSavePermissions}
                disabled={!hasUnsavedChanges}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 ${
                  hasUnsavedChanges
                    ? 'bg-[#335A79] hover:bg-[#223c52] text-white'
                    : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Sauvegarder les Droits</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  categoryFilter === 'ALL'
                    ? 'bg-[#335A79] text-white font-bold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Toutes les sections
              </button>
              {PERMISSION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    categoryFilter === cat.id
                      ? 'bg-[#335A79] text-white font-bold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une permission..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#335A79]"
              />
            </div>
          </div>

          {/* Granular Permission List by Category */}
          <div className="divide-y divide-stone-100 p-2 sm:p-4">
            {PERMISSION_CATEGORIES.map((cat) => {
              const permsInCat = filteredPermissions.filter((p) => p.categorie === cat.id);
              if (permsInCat.length === 0) return null;

              return (
                <div key={cat.id} className="py-4 first:pt-2 last:pb-2">
                  <div className="flex items-center space-x-2 px-3 mb-3">
                    <span className="w-2 h-2 rounded-full bg-[#816C07]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#335A79]">
                      {cat.label}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permsInCat.map((perm) => {
                      const isGranted = !!rolePermissions[selectedRole]?.[perm.code];
                      const isLocked = selectedRole === 'SUPER_ADMIN' && perm.code.startsWith('admin.');

                      return (
                        <div
                          key={perm.id}
                          className={`p-3.5 rounded-xl border transition flex items-start justify-between space-x-3 ${
                            isGranted
                              ? 'bg-stone-50/70 border-stone-200'
                              : 'bg-white border-stone-100 opacity-60'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-semibold text-xs text-stone-900 leading-tight">
                                {perm.nom}
                              </p>
                              <span className="text-[10px] font-mono text-stone-400 bg-white px-1.5 py-0.2 rounded border border-stone-200">
                                {perm.code}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 leading-normal">
                              {perm.description}
                            </p>
                          </div>

                          {/* Toggle Switch */}
                          <div className="flex flex-col items-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePermission(selectedRole, perm.code)}
                              disabled={isLocked}
                              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                                isGranted ? 'bg-[#335A79]' : 'bg-stone-200'
                              } ${isLocked ? 'cursor-not-allowed opacity-80' : ''}`}
                              title={isLocked ? 'Verrouillé pour le Super Admin' : 'Cliquer pour modifier'}
                            >
                              <div
                                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                  isGranted ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            {isLocked && (
                              <span className="text-[9px] text-stone-400 mt-1 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Verrou
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#816C07]" />
              Les modifications de permissions s’appliquent immédiatement à tous les utilisateurs rattachés au rôle.
            </span>
            <button
              onClick={handleSavePermissions}
              disabled={!hasUnsavedChanges}
              className="font-bold text-[#335A79] hover:underline"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: COMPLETE COMPARATIVE MATRIX */}
      {/* ===================================================================== */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-base font-bold text-[#335A79]">
                Matrice Complète d’Habilitation par Rôle
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Vue comparative des 3 rôles principaux et du visiteur public
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleResetToDefaults()}
                className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-medium rounded-xl shadow-2xs transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                <span>Rétablir tout par défaut</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Module / Droit d’accès</th>
                  <th className="py-3.5 px-3 text-center font-bold">Public</th>
                  <th className="py-3.5 px-3 text-center font-bold text-emerald-800">Membre</th>
                  <th className="py-3.5 px-3 text-center font-bold text-[#335A79]">Admin</th>
                  <th className="py-3.5 px-3 text-center font-bold text-[#816C07]">Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const permsInCat = PERMISSION_DEFINITIONS.filter((p) => p.categorie === cat.id);
                  return (
                    <React.Fragment key={cat.id}>
                      <tr className="bg-stone-50/90 font-bold text-[11px] text-[#335A79]">
                        <td colSpan={5} className="py-2.5 px-4 tracking-wider uppercase">
                          {cat.label}
                        </td>
                      </tr>

                      {permsInCat.map((perm) => {
                        const isPublic = !!rolePermissions.PUBLIC?.[perm.code];
                        const isMember = !!rolePermissions.MEMBER?.[perm.code];
                        const isAdmin = !!rolePermissions.ADMIN?.[perm.code];
                        const isSuper = !!rolePermissions.SUPER_ADMIN?.[perm.code];

                        return (
                          <tr key={perm.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-stone-900">{perm.nom}</p>
                              <p className="text-[10px] text-stone-400 font-mono">{perm.code}</p>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {isPublic ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-stone-300 font-mono text-sm">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission('MEMBER', perm.code)}
                                className="focus:outline-none"
                                title="Cliquer pour basculer"
                              >
                                {isMember ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto hover:scale-110 transition" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-stone-300 mx-auto hover:text-stone-400 transition" />
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission('ADMIN', perm.code)}
                                className="focus:outline-none"
                                title="Cliquer pour basculer"
                              >
                                {isAdmin ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#335A79] mx-auto hover:scale-110 transition" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-stone-300 mx-auto hover:text-stone-400 transition" />
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleTogglePermission('SUPER_ADMIN', perm.code)}
                                className="focus:outline-none"
                                title="Cliquer pour basculer"
                              >
                                {isSuper ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#816C07] mx-auto hover:scale-110 transition" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-stone-300 mx-auto hover:text-stone-400 transition" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: USER ACCOUNTS & ASSIGNMENTS */}
      {/* ===================================================================== */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          
          <div className="p-5 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-base font-bold text-[#335A79]">
                Comptes Utilisateurs & Attribution des Rôles
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Gestion des gestionnaires, administrateurs et affectation des privilèges
              </p>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-3.5 py-2 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-xs transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Créer un Compte</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="flex items-center space-x-1.5 w-full sm:w-auto">
              <span className="text-xs text-stone-500 font-medium mr-1">Filtrer par rôle :</span>
              {(['ALL', 'SUPER_ADMIN', 'ADMIN', 'MEMBER'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    userRoleFilter === r
                      ? 'bg-[#335A79] text-white font-bold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {r === 'ALL' ? 'Tous' : r === 'SUPER_ADMIN' ? 'Super Admin' : r === 'ADMIN' ? 'Admin' : 'Membre'}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher par nom, email..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:border-[#335A79]"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Utilisateur</th>
                  <th className="py-3 px-4 font-bold">Contact & Téléphone</th>
                  <th className="py-3 px-4 font-bold">Rôle Attribué</th>
                  <th className="py-3 px-4 font-bold">Statut</th>
                  <th className="py-3 px-4 font-bold">Dernière Connexion</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.map((user) => {
                  const isSuper = user.role === 'SUPER_ADMIN';
                  const isAdmin = user.role === 'ADMIN';

                  return (
                    <tr key={user.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                              isSuper
                                ? 'bg-[#816C07]/10 text-[#816C07]'
                                : isAdmin
                                ? 'bg-[#335A79]/10 text-[#335A79]'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {user.nom.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{user.nom}</p>
                            <p className="text-[11px] text-stone-400">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-stone-600">
                        {user.telephone || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                            isSuper
                              ? 'bg-[#816C07]/10 text-[#816C07] border-[#816C07]/30'
                              : isAdmin
                              ? 'bg-[#335A79]/10 text-[#335A79] border-[#335A79]/30'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            user.statut === 'ACTIF'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-stone-500 bg-stone-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              user.statut === 'ACTIF' ? 'bg-emerald-500' : 'bg-stone-400'
                            }`}
                          />
                          {user.statut}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-stone-500 text-[11px]">
                        {user.derniereConnexion}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditUser(user)}
                            className="p-1.5 text-stone-500 hover:text-[#335A79] hover:bg-stone-100 rounded-lg transition"
                            title="Modifier le rôle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user.id)}
                            className="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-stone-100 rounded-lg transition text-[11px]"
                            title={user.statut === 'ACTIF' ? 'Suspendre l’accès' : 'Réactiver l’accès'}
                          >
                            {user.statut === 'ACTIF' ? 'Suspendre' : 'Activer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Create / Edit Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-serif text-base font-bold text-[#335A79]">
                {userToEdit ? 'Modifier le Compte Utilisateur' : 'Créer un Compte Utilisateur'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Nom complet du titulaire
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex : Mouhamadou Moustapha Fall"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-[#335A79]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Adresse email officielle / de connexion
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ex : m.fall@mutahabbina.sn"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-[#335A79]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="+221 77 000 00 00"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:border-[#335A79]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Rôle principal d’habilitation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SUPER_ADMIN', 'ADMIN', 'MEMBER'] as const).map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setFormRole(r)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition text-center ${
                        formRole === r
                          ? 'border-[#335A79] bg-[#335A79]/10 text-[#335A79]'
                          : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {r === 'SUPER_ADMIN' ? 'Super Admin' : r === 'ADMIN' ? 'Admin' : 'Membre'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  Statut du compte
                </label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="userStatus"
                      value="ACTIF"
                      checked={formStatus === 'ACTIF'}
                      onChange={() => setFormStatus('ACTIF')}
                      className="text-[#335A79]"
                    />
                    <span className="text-stone-700 font-medium">Actif (autorisé)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="userStatus"
                      value="SUSPENDU"
                      checked={formStatus === 'SUSPENDU'}
                      onChange={() => setFormStatus('SUSPENDU')}
                      className="text-stone-400"
                    />
                    <span className="text-stone-500 font-medium">Suspendu</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 text-xs font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#335A79] hover:bg-[#223c52] text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {userToEdit ? 'Mettre à jour' : 'Enregistrer le Compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
