import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../services/apiConfig';
import {
  getAuthHeaders,
  fetchUsersApi,
  createUserApi,
  updateUserApi,
  resetUserPasswordApi,
  deleteUserApi,
  ManagedUser,
} from '../services/authService';
import { getMembers } from '../services/memberService';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';

// ==============================================================================
// 1. PAGE JOURNAL D'AUDIT IMMUABLE (MOBILE-FIRST + ACCORDÉON DE MODIFICATIONS)
// ==============================================================================

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Accordéons ouverts (sur mobile) et Modal de détails (sur desktop)
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [selectedLogForModal, setSelectedLogForModal] = useState<any | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/audit/`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Impossible de charger le journal d’audit.');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement de l’audit.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleAccordion = (id: string) => {
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case 'CREATE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'UPDATE':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'DELETE':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'HARD_DELETE':
        return 'bg-red-500/20 text-red-400 border-red-500/40 font-bold';
      case 'RESTORE':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'LOGIN':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-[#2b3547]/40 text-[#9ca7b8] border-[#2b3547]';
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterEntity && log.entity !== filterEntity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const actor = (log.user?.email || log.user_email || '').toLowerCase();
      const entityId = (log.entity_id || '').toLowerCase();
      const entity = (log.entity || '').toLowerCase();
      if (!actor.includes(q) && !entityId.includes(q) && !entity.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* En-tête de section */}
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[28px]">verified_user</span>
            Historique des actions de la direction
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">
            Enregistrement chronologique et sécurisé de chaque action de la direction.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1b2332] hover:bg-[#2b3547] text-xs text-[#e5e9f2] border border-[#2b3547] transition w-fit"
        >
          <span className="material-symbols-outlined text-[16px] text-[#f2ca50]">refresh</span>
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Barre de filtres */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-[#111722] border border-[#2b3547]/60 text-xs">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#f2ca50] text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par auteur, entité, ID..."
            className="w-full bg-[#06090e] text-[#e5e9f2] placeholder-[#788294] rounded-xl pl-9 pr-3 py-2 outline-none border border-[#2b3547] focus:border-[#f2ca50]"
          />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-[#06090e] text-[#e5e9f2] rounded-xl px-3 py-2 outline-none border border-[#2b3547] focus:border-[#f2ca50]"
        >
          <option value="">Toutes les actions</option>
          <option value="CREATE">Création (CREATE)</option>
          <option value="UPDATE">Modification (UPDATE)</option>
          <option value="DELETE">Archivage (DELETE)</option>
          <option value="RESTORE">Restauration (RESTORE)</option>
          <option value="HARD_DELETE">Suppression Physique (HARD_DELETE)</option>
          <option value="LOGIN">Connexion (LOGIN)</option>
        </select>

        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="bg-[#06090e] text-[#e5e9f2] rounded-xl px-3 py-2 outline-none border border-[#2b3547] focus:border-[#f2ca50]"
        >
          <option value="">Toutes les entités</option>
          <option value="Member">Membre (Member)</option>
          <option value="User">Utilisateur (User)</option>
          <option value="MemberSkill">Compétence (MemberSkill)</option>
          <option value="MemberService">Service (MemberService)</option>
          <option value="MemberAvailability">Disponibilité (MemberAvailability)</option>
          <option value="MemberRelation">Relation (MemberRelation)</option>
        </select>
      </div>

      {/* ======================================================================= */}
      {/* VUE MOBILE (< md / < 768px) : CARTES CHRONOLOGIQUES AVEC ACCORDÉON */}
      {/* ======================================================================= */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-[#9ca7b8] rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs">
            Chargement des événements...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-[#9ca7b8] rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs">
            Aucun événement ne correspond aux critères.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = !!expandedLogIds[log.id];
            return (
              <div
                key={log.id}
                className="p-4 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-lg space-y-2.5 transition"
              >
                {/* Ligne haute : Action + Date */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${getActionBadge(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-[11px] text-[#9ca7b8] font-mono">
                    {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'Récemment'}
                  </span>
                </div>

                {/* Cible & Entité */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#e5e9f2] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#f2ca50]">category</span>
                    <span>{log.entity}</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#f2ca50] truncate max-w-[160px]">
                    {log.entity_id || '-'}
                  </span>
                </div>

                {/* Auteur & IP */}
                <div className="text-[11px] text-[#9ca7b8] flex items-center justify-between border-t border-[#2b3547]/40 pt-2">
                  <span className="flex items-center gap-1 text-[#e5e9f2]">
                    <span className="material-symbols-outlined text-[14px] text-[#9ca7b8]">person</span>
                    <span>{log.user?.email || log.user_email || 'Système / Anonyme'}</span>
                  </span>
                  {log.ip_address && (
                    <span className="font-mono text-[10px] text-[#788294]">{log.ip_address}</span>
                  )}
                </div>

                {/* Bouton déroulant accordéon pour deltas */}
                {(log.old_values || log.new_values) && (
                  <div className="pt-1">
                    <button
                      onClick={() => toggleAccordion(log.id)}
                      className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#111722] hover:bg-[#1b2332] text-[11px] text-[#f2ca50] transition"
                    >
                      <span>{isExpanded ? 'Masquer les deltas' : 'Voir les modifications (deltas)'}</span>
                      <span className="material-symbols-outlined text-[16px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-2.5 rounded-xl bg-[#090d13] border border-[#2b3547]/80 text-[10px] font-mono space-y-2 overflow-x-auto">
                        {log.old_values && (
                          <div>
                            <span className="text-red-400 font-bold block mb-1">Anciennes valeurs :</span>
                            <pre className="text-[#9ca7b8]">{JSON.stringify(log.old_values, null, 2)}</pre>
                          </div>
                        )}
                        {log.new_values && (
                          <div>
                            <span className="text-emerald-400 font-bold block mb-1">Nouvelles valeurs :</span>
                            <pre className="text-[#e5e9f2]">{JSON.stringify(log.new_values, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================================= */}
      {/* VUE DESKTOP (≥ md / ≥ 768px) : TABLE INSTITUTIONNELLE COMPLÈTE */}
      {/* ======================================================================= */}
      <div className="hidden md:block rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs font-body-md">
            <thead>
              <tr className="bg-[#111722] text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                <th className="py-3 px-5">Action</th>
                <th className="py-3 px-4">Entité</th>
                <th className="py-3 px-4">Identifiant Cible</th>
                <th className="py-3 px-4">Utilisateur / Auteur</th>
                <th className="py-3 px-4">Adresse IP</th>
                <th className="py-3 px-4">Date &amp; Heure</th>
                <th className="py-3 px-5 text-right">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3547]/20">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#9ca7b8]">Chargement du journal d'audit...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#9ca7b8]">Aucun événement d'audit enregistré.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1b2332]/50 transition">
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#e5e9f2]">{log.entity}</td>
                    <td className="py-3 px-4 text-[#f2ca50] font-mono text-[11px]">{log.entity_id || '-'}</td>
                    <td className="py-3 px-4 text-[#e5e9f2]">{log.user?.email || log.user_email || 'Système / Anonyme'}</td>
                    <td className="py-3 px-4 text-[#9ca7b8] font-mono text-[11px]">{log.ip_address || '-'}</td>
                    <td className="py-3 px-4 text-[#9ca7b8] font-mono text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '-'}
                    </td>
                    <td className="py-3 px-5 text-right">
                      {(log.old_values || log.new_values) ? (
                        <button
                          onClick={() => setSelectedLogForModal(log)}
                          className="px-2.5 py-1 rounded-lg bg-[#111722] hover:bg-[#f2ca50] hover:text-slate-950 text-[#f2ca50] text-[11px] font-semibold transition"
                        >
                          Payload
                        </button>
                      ) : (
                        <span className="text-[#788294] text-[11px]">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Détails du Payload (Desktop) */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setSelectedLogForModal(null)} />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#0f1520] border border-[#f2ca50]/40 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2b3547]/60 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${getActionBadge(selectedLogForModal.action)}`}>
                  {selectedLogForModal.action}
                </span>
                <span className="font-semibold text-sm text-[#e5e9f2]">
                  {selectedLogForModal.entity} ({selectedLogForModal.entity_id})
                </span>
              </div>
              <button
                onClick={() => setSelectedLogForModal(null)}
                className="p-1.5 rounded-lg text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1b2332]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {selectedLogForModal.old_values && (
                <div className="p-3 rounded-xl bg-[#140b0e] border border-red-500/30 space-y-1.5 overflow-x-auto">
                  <span className="text-red-400 font-bold block">Anciennes Valeurs :</span>
                  <pre className="text-[11px] text-[#9ca7b8] font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedLogForModal.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLogForModal.new_values && (
                <div className="p-3 rounded-xl bg-[#081510] border border-emerald-500/30 space-y-1.5 overflow-x-auto">
                  <span className="text-emerald-400 font-bold block">Nouvelles Valeurs :</span>
                  <pre className="text-[11px] text-[#e5e9f2] font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedLogForModal.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ==============================================================================
// 2. PAGE GESTION COMPLÈTE DES COMPTES UTILISATEURS (RBAC + MEMBRE ≠ USER)
// ==============================================================================

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<ManagedUser | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<ManagedUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [deleteUserTarget, setDeleteUserTarget] = useState<ManagedUser | null>(null);

  // Formulaire création
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createFirstName, setCreateFirstName] = useState('');
  const [createLastName, setCreateLastName] = useState('');
  const [createRole, setCreateRole] = useState<'member' | 'admin' | 'superadmin'>('member');
  const [createMemberId, setCreateMemberId] = useState<string>('');

  // Formulaire édition
  const [editRole, setEditRole] = useState<'member' | 'admin' | 'superadmin'>('member');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editMemberId, setEditMemberId] = useState<string>('');

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, membersData] = await Promise.all([
        fetchUsersApi({
          search: searchTerm || undefined,
          role: roleFilter || undefined,
          is_active: activeFilter === '' ? undefined : activeFilter === 'true',
        }),
        getMembers(100, 1),
      ]);
      setUsers(usersData);
      setMembersList(membersData.members || []);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger la liste des utilisateurs.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, roleFilter, activeFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Ouverture automatique du modal de création si action=create dans l'URL
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      const memberId = searchParams.get('member_id');
      if (memberId) setCreateMemberId(memberId);
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await createUserApi({
        email: createEmail,
        password: createPassword,
        first_name: createFirstName,
        last_name: createLastName,
        role: createRole,
        member_id: createMemberId || null,
        is_active: true,
      });
      setNotification({ type: 'success', message: `Compte ${createEmail} créé avec succès.` });
      setShowCreateModal(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateFirstName('');
      setCreateLastName('');
      setCreateRole('member');
      setCreateMemberId('');
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal) return;
    try {
      setError(null);
      await updateUserApi(editUserModal.id, {
        first_name: editFirstName,
        last_name: editLastName,
        role: editRole,
        is_active: editIsActive,
        member_id: editMemberId || null,
      });
      setNotification({ type: 'success', message: `Utilisateur ${editUserModal.email} mis à jour.` });
      setEditUserModal(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    try {
      setError(null);
      const msg = await resetUserPasswordApi(resetPwdUser.id, newPasswordInput);
      setNotification({ type: 'success', message: msg });
      setResetPwdUser(null);
      setNewPasswordInput('');
    } catch (err: any) {
      setError(err.message || 'Erreur de réinitialisation.');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteUserTarget) return;
    try {
      setError(null);
      const msg = await deleteUserApi(deleteUserTarget.id);
      setNotification({ type: 'success', message: msg });
      setDeleteUserTarget(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  const openEditModal = (u: ManagedUser) => {
    setEditUserModal(u);
    setEditFirstName(u.first_name || '');
    setEditLastName(u.last_name || '');
    setEditRole(u.role as any);
    setEditIsActive(u.is_active);
    setEditMemberId(u.member_id || '');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30 font-bold';
      case 'admin':
        return 'bg-[#f2ca50]/15 text-[#f2ca50] border-[#f2ca50]/30 font-bold';
      case 'agent':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30 font-medium';
      case 'member':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-[#2b3547]/40 text-[#9ca7b8] border-[#2b3547]';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* En-tête */}
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[28px]">manage_accounts</span>
            Comptes Utilisateurs &amp; Privilèges RBAC
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">
            Contrôle des accès, assignation des rôles et dissociation stricte <strong>Membre ≠ Utilisateur</strong>.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateMemberId('');
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 font-bold shadow-[0_4px_18px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition text-xs w-fit"
        >
          <span className="material-symbols-outlined text-[18px] font-bold">person_add</span>
          <span>+ Créer un compte utilisateur</span>
        </button>
      </div>

      {/* Règle d'or institutionnelle */}
      <div className="p-4 rounded-xl bg-[#111722] border border-blue-500/30 text-xs text-[#9ca7b8] flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-400 text-[20px] shrink-0 mt-0.5">info</span>
        <div>
          <strong className="text-[#e5e9f2] block mb-0.5">Règle de dissociation stricte (Membre ≠ Utilisateur) :</strong>
          Un membre de la Dahirah peut exister sans compte d'accès. La suppression d'un compte utilisateur ne supprime JAMAIS la fiche membre officielle ni ses archives d'adhésion.
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filtres & Recherche */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-[#111722] border border-[#2b3547]/60 text-xs">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#f2ca50] text-[18px]">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par email, nom, matricule..."
            className="w-full bg-[#06090e] text-[#e5e9f2] placeholder-[#788294] rounded-xl pl-9 pr-3 py-2 outline-none border border-[#2b3547] focus:border-[#f2ca50]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-[#06090e] text-[#e5e9f2] rounded-xl px-3 py-2 outline-none border border-[#2b3547] focus:border-[#f2ca50]"
        >
          <option value="">Tous les rôles</option>
          <option value="superadmin">Super-Administrateurs</option>
          <option value="admin">Administrateurs</option>
          <option value="agent">Agents Enrôleurs</option>
          <option value="member">Membres ordinaires</option>
        </select>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="bg-[#06090e] text-[#e5e9f2] rounded-xl px-3 py-2 outline-none border border-[#2b3547] focus:border-[#f2ca50]"
        >
          <option value="">Tous les statuts</option>
          <option value="true">Actifs uniquement</option>
          <option value="false">Désactivés uniquement</option>
        </select>
      </div>

      {/* ======================================================================= */}
      {/* VUE MOBILE (< md) : CARTES UTILISATEURS VERTICALES */}
      {/* ======================================================================= */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-[#9ca7b8] rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs">
            Chargement des comptes utilisateurs...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[#9ca7b8] rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs">
            Aucun compte utilisateur trouvé.
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="p-4 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-lg space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm text-[#e5e9f2] truncate">{u.email}</span>
                  <span className="text-xs text-[#9ca7b8]">
                    {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : 'Sans nom renseigné'}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full border text-[10px] uppercase ${getRoleBadge(u.role)}`}>
                  {u.role}
                </span>
              </div>

              {/* Fiche Membre Liée */}
              <div className="p-2.5 rounded-xl bg-[#111722] border border-[#2b3547]/50 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[16px] text-[#f2ca50]">person</span>
                  {u.member_matricule ? (
                    <div className="flex flex-col truncate">
                      <span className="text-[#e5e9f2] font-semibold truncate">{u.member_display_name}</span>
                      <span className="text-[10px] text-[#f2ca50] font-mono">{u.member_matricule}</span>
                    </div>
                  ) : (
                    <span className="text-[#788294] italic text-[11px]">Non lié à un profil membre</span>
                  )}
                </div>

                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {u.is_active ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>

              {/* Boutons d'actions */}
              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#2b3547]/40">
                <button
                  onClick={() => openEditModal(u)}
                  className="p-1.5 rounded-lg bg-[#1b2332] hover:bg-[#2b3547] text-[#e5e9f2] text-xs transition"
                  title="Modifier"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
                <button
                  onClick={() => {
                    setResetPwdUser(u);
                    setNewPasswordInput('');
                  }}
                  className="p-1.5 rounded-lg bg-[#1b2332] hover:bg-[#2b3547] text-amber-400 text-xs transition"
                  title="Réinitialiser le mot de passe"
                >
                  <span className="material-symbols-outlined text-[16px]">key</span>
                </button>
                {currentUser?.id !== u.id && (
                  <button
                    onClick={() => setDeleteUserTarget(u)}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs transition"
                    title="Supprimer le compte"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================================================================= */}
      {/* VUE DESKTOP (≥ md) : TABLE DES UTILISATEURS */}
      {/* ======================================================================= */}
      <div className="hidden md:block rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs font-body-md">
            <thead>
              <tr className="bg-[#111722] text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                <th className="py-3 px-5">Utilisateur (Email)</th>
                <th className="py-3 px-4">Nom &amp; Prénom</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Profil Membre Lié</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3547]/20">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#9ca7b8]">Chargement des utilisateurs...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#9ca7b8]">Aucun compte utilisateur répertorié.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1b2332]/50 transition">
                    <td className="py-3 px-5 font-semibold text-[#e5e9f2]">{u.email}</td>
                    <td className="py-3 px-4 text-[#9ca7b8]">
                      {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] uppercase ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.member_matricule ? (
                        <Link
                          to={`/members/${u.member_matricule}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111722] hover:bg-[#1b2332] text-[#e5e9f2] hover:text-[#f2ca50] transition border border-[#2b3547]"
                        >
                          <span className="material-symbols-outlined text-[14px] text-[#f2ca50]">person</span>
                          <span>{u.member_display_name}</span>
                          <span className="text-[10px] text-[#9ca7b8] font-mono">({u.member_matricule})</span>
                        </Link>
                      ) : (
                        <span className="text-[#788294] italic text-[11px]">Aucun profil lié</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                        {u.is_active ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg bg-[#1b2332] hover:bg-[#2b3547] text-[#e5e9f2] transition"
                          title="Modifier"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            setResetPwdUser(u);
                            setNewPasswordInput('');
                          }}
                          className="p-1.5 rounded-lg bg-[#1b2332] hover:bg-[#2b3547] text-amber-400 transition"
                          title="Réinitialiser le mot de passe"
                        >
                          <span className="material-symbols-outlined text-[15px]">key</span>
                        </button>
                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => setDeleteUserTarget(u)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                            title="Supprimer le compte"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* MODAL 1 : CRÉATION UTILISATEUR */}
      {/* ======================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowCreateModal(false)} />
          <form
            onSubmit={handleCreateSubmit}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0f1520] border border-[#f2ca50]/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#2b3547]/60 pb-3">
              <div className="flex items-center gap-2 text-[#f2ca50] font-headline-sm text-base font-semibold">
                <span className="material-symbols-outlined text-[22px]">person_add</span>
                <span>Nouveau Compte Utilisateur</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1b2332]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#e5e9f2] mb-1">Adresse Email *</label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="exemple@dairatu.sn"
                  className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#e5e9f2] mb-1">Mot de Passe Provisoire (min 8 car.) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#e5e9f2] mb-1">Prénom</label>
                  <input
                    type="text"
                    value={createFirstName}
                    onChange={(e) => setCreateFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#e5e9f2] mb-1">Nom</label>
                  <input
                    type="text"
                    value={createLastName}
                    onChange={(e) => setCreateLastName(e.target.value)}
                    placeholder="Nom"
                    className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#e5e9f2] mb-1">Rôle Système</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as any)}
                  className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                >
                  <option value="member">Membre (Accès portail disciple)</option>
                  <option value="admin">Administrateur (Gestion membres &amp; modules)</option>
                  {isSuperAdmin && (
                    <option value="superadmin">Super-Administrateur (Contrôle total &amp; purge)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#e5e9f2] mb-1">Associer à une Fiche Membre (Optionnel)</label>
                <select
                  value={createMemberId}
                  onChange={(e) => setCreateMemberId(e.target.value)}
                  className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                >
                  <option value="">-- Aucun membre lié --</option>
                  {membersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.matricule} • {m.prenom} {m.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b3547]/60">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-[#1b2332] text-[#9ca7b8] hover:text-[#e5e9f2] transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#e9c349] to-[#f2ca50] text-slate-950 font-bold transition shadow-md hover:brightness-110"
              >
                Créer l'utilisateur
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 2 : MODIFICATION UTILISATEUR */}
      {/* ======================================================================= */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setEditUserModal(null)} />
          <form
            onSubmit={handleEditSubmit}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0f1520] border border-[#f2ca50]/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#2b3547]/60 pb-3">
              <div className="flex items-center gap-2 text-[#f2ca50] font-headline-sm text-base font-semibold">
                <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                <span>Modifier : {editUserModal.email}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="p-1 rounded-lg text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1b2332]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#e5e9f2] mb-1">Prénom</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#e5e9f2] mb-1">Nom</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#e5e9f2] mb-1">Rôle Système</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                >
                  <option value="member">Membre (Accès portail disciple)</option>
                  <option value="admin">Administrateur</option>
                  {isSuperAdmin && (
                    <option value="superadmin">Super-Administrateur</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#e5e9f2] mb-1">Associer / Dissocier Fiche Membre</label>
                <select
                  value={editMemberId}
                  onChange={(e) => setEditMemberId(e.target.value)}
                  className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-[#f2ca50]"
                >
                  <option value="">-- Aucun membre lié (Détacher) --</option>
                  {membersList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.matricule} • {m.prenom} {m.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-[#2b3547] bg-[#06090e] text-[#f2ca50] focus:ring-0"
                />
                <label htmlFor="editIsActive" className="text-xs text-[#e5e9f2] font-semibold">
                  Compte utilisateur actif (autorisé à se connecter)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b3547]/60">
              <button
                type="button"
                onClick={() => setEditUserModal(null)}
                className="px-4 py-2 rounded-xl bg-[#1b2332] text-[#9ca7b8] hover:text-[#e5e9f2] transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#e9c349] to-[#f2ca50] text-slate-950 font-bold transition shadow-md hover:brightness-110"
              >
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 3 : RÉINITIALISATION DU MOT DE PASSE */}
      {/* ======================================================================= */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setResetPwdUser(null)} />
          <form
            onSubmit={handleResetPasswordSubmit}
            className="relative z-10 w-full max-w-md rounded-2xl bg-[#0f1520] border border-amber-500/40 p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 text-amber-400 font-headline-sm text-base font-semibold">
              <span className="material-symbols-outlined text-[22px]">key</span>
              <span>Réinitialiser le Mot de Passe</span>
            </div>

            <p className="text-[#9ca7b8] leading-relaxed">
              Définir un nouveau mot de passe pour le compte <strong className="text-[#e5e9f2]">{resetPwdUser.email}</strong>.
            </p>

            <div>
              <label className="block font-semibold text-[#e5e9f2] mb-1">Nouveau Mot de Passe (min 8 caractères) *</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#06090e] border border-[#2b3547] rounded-xl px-3 py-2 text-[#e5e9f2] outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetPwdUser(null)}
                className="px-4 py-2 rounded-xl bg-[#1b2332] text-[#9ca7b8] hover:text-[#e5e9f2] transition"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-md"
              >
                Valider le nouveau mot de passe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================= */}
      {/* MODAL 4 : SUPPRESSION D'UN COMPTE UTILISATEUR (SANS TOUCHER AU MEMBRE) */}
      {/* ======================================================================= */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#140b0e] border border-red-500/40 p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center gap-2 text-red-400 font-headline-sm text-base font-bold">
              <span className="material-symbols-outlined text-[24px]">delete</span>
              <span>Supprimer le Compte Utilisateur</span>
            </div>

            <p className="text-[#e5e9f2] leading-relaxed">
              Êtes-vous sûr de vouloir supprimer les identifiants d'accès du compte <strong className="text-red-300">{deleteUserTarget.email}</strong> ?
            </p>

            <div className="p-3 rounded-xl bg-[#201015] border border-red-500/20 text-[#9ca7b8] text-[11px] leading-relaxed">
              <strong className="text-emerald-400 block mb-0.5">Garantie d'intégrité :</strong>
              Cette action révoque uniquement la session et le mot de passe.
              {deleteUserTarget.member_matricule ? (
                <span> La fiche du membre <strong>{deleteUserTarget.member_display_name}</strong> ({deleteUserTarget.member_matricule}) restera entièrement préservée dans l'annuaire.</span>
              ) : (
                <span> Aucun membre n'est impacté.</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#1b2332] text-[#9ca7b8] hover:text-[#e5e9f2] transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-md"
              >
                Supprimer le compte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ==============================================================================
// 3. PARAMÈTRES SYSTÈME & CONFIGURATION PLATEFORME
// ==============================================================================

export const SystemSettingsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
          <span className="material-symbols-outlined text-[#f2ca50] text-[26px]">settings</span>
          Configuration &amp; État de la Plateforme
        </h1>
        <p className="text-xs text-[#9ca7b8] mt-1">Surveillance des services et intégrité applicative.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <span className="material-symbols-outlined text-[18px]">dns</span>
            <span>Base de données centrale</span>
          </div>
          <p className="text-[#9ca7b8]">Statut : <span className="text-emerald-400 font-bold">Connectée &amp; Opérationnelle</span></p>
          <p className="text-[#9ca7b8]">Sécurité des flux : <span className="font-mono text-[#e5e9f2]">Chiffrement SSL actif</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#f2ca50] font-bold">
            <span className="material-symbols-outlined text-[18px]">cloud</span>
            <span>Hébergement et distribution web</span>
          </div>
          <p className="text-[#9ca7b8]">Navigation fluide : <span className="text-emerald-400 font-bold">Active</span></p>
          <p className="text-[#9ca7b8]">Protection des accès : <span className="text-emerald-400 font-bold">Sécurisée</span></p>
        </div>
      </div>
    </div>
  );
};


// ==============================================================================
// 4. ROUTE 404
// ==============================================================================

export const NotFoundPage: React.FC = () => {
  return (
    <div className="py-24 max-w-lg mx-auto text-center flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-[#f2ca50]/10 text-[#f2ca50] flex items-center justify-center">
        <span className="material-symbols-outlined text-[36px]">travel_explore</span>
      </div>
      <h1 className="font-headline-lg text-4xl font-bold text-[#f2ca50]">404</h1>
      <h2 className="font-headline-sm text-lg font-semibold text-[#e5e9f2]">Page Introuvable</h2>
      <p className="text-xs text-[#9ca7b8]">
        L'adresse demandée ne correspond à aucune route répertoriée de la plateforme Dāʾiratu.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] to-[#f2ca50] text-slate-950 font-bold text-xs shadow-md hover:brightness-110 transition"
      >
        Retourner au Tableau de Bord
      </Link>
    </div>
  );
};
