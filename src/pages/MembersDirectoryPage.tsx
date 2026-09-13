import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMembers, deleteMember, hardDeleteMember } from '../services/memberService';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';

export const MembersDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Centre d'action contextuel
  const [actionMember, setActionMember] = useState<Member | null>(null);

  // Modal de suppression physique définitive (Super Admin)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Member | null>(null);
  const [hardDeleteInput, setHardDeleteInput] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const searchTerm = searchParams.get('search') || '';
  const filterStatut = searchParams.get('statut') || '';
  const filterSituation = searchParams.get('situation') || '';

  const getSituationLabel = (sit: string) => {
    switch (sit?.toUpperCase()) {
      case 'LEARNER':
      case 'APPRENANT':
        return 'Élèves & Étudiants (Apprenants)';
      case 'STUDENT':
      case 'ETUDIANT':
        return 'Étudiant';
      case 'PUPIL':
      case 'ELEVE':
        return 'Élève';
      case 'SALARIE':
      case 'EMPLOYEE':
        return 'Salarié';
      case 'ENTREPRENEUR':
        return 'Entrepreneur';
      case 'INDEPENDANT':
      case 'FREELANCE':
        return 'Indépendant';
      case 'SANS_EMPLOI':
      case 'JOB_SEEKER':
        return 'En recherche';
      case 'RETRAITE':
      case 'RETIRED':
        return 'Retraité';
      default:
        return sit || 'Membre';
    }
  };

  const getSituationBadgeStyle = (sit: string) => {
    switch (sit?.toUpperCase()) {
      case 'STUDENT':
      case 'ETUDIANT':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PUPIL':
      case 'ELEVE':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'ENTREPRENEUR':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'SALARIE':
      case 'EMPLOYEE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-[#2b3547]/40 text-[#9ca7b8] border-[#2b3547]';
    }
  };

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMembers(100, 1, filterSituation || undefined);
      let list = response.members || [];

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        list = list.filter(
          (m) =>
            m.nom.toLowerCase().includes(lower) ||
            m.prenom.toLowerCase().includes(lower) ||
            m.matricule.toLowerCase().includes(lower) ||
            (m.email && m.email.toLowerCase().includes(lower))
        );
      }

      if (filterStatut) {
        list = list.filter((m) => m.statutCompte === filterStatut);
      }

      setMembers(list);
      setTotalCount(response.totalCount || list.length);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l’annuaire.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filterStatut, filterSituation]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleSoftDelete = async (member: Member) => {
    if (!window.confirm(`Confirmez-vous l'archivage (soft-delete) du membre ${member.prenom} ${member.nom} (${member.matricule}) ?`)) {
      return;
    }
    try {
      await deleteMember(member.id);
      setNotification({ type: 'success', message: `Membre ${member.matricule} archivé avec succès.` });
      setActionMember(null);
      fetchMembers();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de l’archivage.' });
    }
  };

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return;
    if (hardDeleteInput.trim() !== hardDeleteTarget.matricule) {
      setNotification({ type: 'error', message: 'Le matricule saisi ne correspond pas exactement.' });
      return;
    }

    setIsDeleting(true);
    try {
      await hardDeleteMember(hardDeleteTarget.id);
      setNotification({
        type: 'success',
        message: `Membre ${hardDeleteTarget.matricule} définitivement supprimé de PostgreSQL Neon.`
      });
      setHardDeleteTarget(null);
      setHardDeleteInput('');
      setActionMember(null);
      fetchMembers();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erreur lors de la suppression irréversible.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditor = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'agent';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      {/* En-tête de section Annuaire */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <div>
          <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[28px]">groups</span>
            Annuaire Communautaire des Membres
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">
            Répertoire officiel et souverain des disciples • Dāʾiratu Al-Mutahābbīna Fillāhi
          </p>
        </div>

        {isEditor && (
          <Link
            to="/members/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 font-bold shadow-[0_4px_18px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition text-xs"
          >
            <span className="material-symbols-outlined text-[18px] font-bold">person_add</span>
            <span>+ Nouvel Enrôlement</span>
          </Link>
        )}
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

      {/* Barre de Recherche & Filtres */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl bg-[#111722] border border-[#2b3547]/60">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#f2ca50] text-[19px]">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, prénom, matricule (ex: DAMF-0001)..."
            className="w-full bg-[#06090e] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none border border-[#2b3547] focus:border-[#f2ca50] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-[#9ca7b8] whitespace-nowrap pl-2">
            <strong className="text-[#f2ca50]">{members.length}</strong> membre{members.length > 1 ? 's' : ''} affiché{members.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {filterSituation && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e2638] border border-[#f2ca50]/40 text-xs text-[#e5e9f2] w-fit shadow-sm">
          <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">filter_alt</span>
          <span>Filtre appliqué : <strong className="text-[#f2ca50]">{getSituationLabel(filterSituation)}</strong> ({totalCount})</span>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('situation');
              setSearchParams(p);
            }}
            className="ml-2 px-2 py-0.5 rounded-lg bg-[#111722] hover:bg-[#2b3547] text-[#9ca7b8] hover:text-[#f2ca50] transition flex items-center gap-1 text-[11px] border border-[#2b3547]"
            title="Effacer le filtre"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            <span>Tous les membres</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VUE MOBILE-FIRST (< md / < 768px) : CARTES VERTICALES SANS TABLE HORIZONTALE */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3.5">
        {isLoading ? (
          <div className="p-10 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-center text-[#9ca7b8] space-y-2">
            <span className="material-symbols-outlined text-[28px] animate-spin text-[#f2ca50]">refresh</span>
            <p className="text-xs">Chargement des fiches membres...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-center text-[#9ca7b8] text-xs">
            Aucun membre ne correspond à vos critères de recherche.
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-lg space-y-3 transition hover:border-[#f2ca50]/40"
            >
              {/* Ligne 1 : Avatar, Nom, Matricule et Badge Statut */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-[#111722] border border-[#f2ca50]/30 text-[#f2ca50] flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                    {member.prenom?.[0] || 'M'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <Link
                      to={`/members/${member.matricule || member.id}`}
                      className="font-semibold text-sm text-[#e5e9f2] hover:text-[#f2ca50] transition truncate"
                    >
                      {member.prenom} {member.nom}
                    </Link>
                    <span className="text-[11px] text-[#f2ca50] font-mono tracking-wide">{member.matricule}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>
                  {member.statutCompte || 'ACTIF'}
                </span>
              </div>

              {/* Ligne 2 : Badges & Chips Métier / Ville */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${getSituationBadgeStyle(member.situation)}`}>
                  <span className="material-symbols-outlined text-[13px]">person</span>
                  <span>{getSituationLabel(member.situation)}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1b2332] text-[#e5e9f2] border border-[#2b3547] font-medium">
                  <span className="material-symbols-outlined text-[13px] text-[#f2ca50]">work</span>
                  <span className="truncate max-w-[150px]">{member.professionActuelle || 'Adhérent'}</span>
                </span>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1b2332] text-[#9ca7b8] border border-[#2b3547]">
                  <span className="material-symbols-outlined text-[13px] text-sky-400">location_on</span>
                  <span>{member.ville || 'Dakar'}</span>
                </span>
              </div>

              {/* Ligne 3 : Barre d'action rapide + Bouton ••• */}
              <div className="flex items-center justify-between pt-2 border-t border-[#2b3547]/40 gap-2">
                <Link
                  to={`/members/${member.matricule || member.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] text-xs font-semibold transition"
                >
                  <span>Fiche 360°</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </Link>

                {isEditor && (
                  <Link
                    to={`/members/${member.matricule || member.id}/edit`}
                    className="p-2 rounded-xl bg-[#242e40]/70 hover:bg-[#f2ca50] hover:text-slate-950 text-[#9ca7b8] transition flex items-center justify-center"
                    title="Modifier"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Link>
                )}

                {/* Bouton d'actions contextuelles */}
                <button
                  onClick={() => setActionMember(member)}
                  className="p-2 rounded-xl bg-[#1b2332] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] border border-[#2b3547] transition flex items-center justify-center cursor-pointer"
                  title="Centre d'actions contextuel"
                >
                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. VUE DESKTOP (≥ md / ≥ 768px) : TABLE INSTITUTIONNELLE COMPLÈTE */}
      {/* ========================================================================= */}
      <div className="hidden md:block rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs font-body-md">
            <thead>
              <tr className="bg-[#111722] text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                <th className="py-3.5 px-5">Membre &amp; Matricule</th>
                <th className="py-3.5 px-4">Situation &amp; Profession</th>
                <th className="py-3.5 px-4">Pôle / Ville</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3547]/20">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9ca7b8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-[#f2ca50]">refresh</span>
                      <span>Chargement des fiches membres...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9ca7b8]">
                    Aucun membre ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="group hover:bg-[#1b2332]/60 transition-colors">
                    
                    {/* Identité & Matricule */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#111722] border border-[#f2ca50]/30 text-[#f2ca50] flex items-center justify-center font-bold text-xs shadow-inner">
                          {member.prenom?.[0] || 'M'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <Link
                            to={`/members/${member.matricule || member.id}`}
                            className="font-semibold text-sm text-[#e5e9f2] group-hover:text-[#f2ca50] transition-colors"
                          >
                            {member.prenom} {member.nom}
                          </Link>
                          <span className="text-[11px] text-[#f2ca50] font-mono">{member.matricule}</span>
                        </div>
                      </div>
                    </td>

                    {/* Profession & Situation */}
                    <td className="py-3.5 px-4 text-[#e5e9f2]">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{member.professionActuelle || 'Adhérent'}</span>
                        <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-semibold border ${getSituationBadgeStyle(member.situation)}`}>
                          {getSituationLabel(member.situation)}
                        </span>
                      </div>
                    </td>

                    {/* Ville / Pôle */}
                    <td className="py-3.5 px-4 text-[#9ca7b8]">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#bfcfed]">location_on</span>
                        <span>{member.ville || 'Dakar'}</span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>
                        {member.statutCompte || 'ACTIF'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/members/${member.matricule || member.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] text-xs font-semibold transition"
                          title="Consulter la fiche 360°"
                        >
                          <span>Fiche</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>

                        {isEditor && (
                          <Link
                            to={`/members/${member.matricule || member.id}/edit`}
                            className="p-1.5 rounded-lg bg-[#242e40]/70 hover:bg-[#ffb95f] hover:text-slate-950 text-[#9ca7b8] transition"
                            title="Modifier ce membre"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </Link>
                        )}

                        <button
                          onClick={() => setActionMember(member)}
                          className="p-1.5 rounded-lg bg-[#1b2332] hover:bg-[#f2ca50] hover:text-slate-950 text-[#9ca7b8] border border-[#2b3547] transition"
                          title="Actions avancées"
                        >
                          <span className="material-symbols-outlined text-[16px]">more_vert</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CENTRE D'ACTIONS CONTEXTUEL (MODAL ••• ACTIONS) */}
      {/* ========================================================================= */}
      {actionMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setActionMember(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-[#0f1520] border border-[#f2ca50]/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-[#2b3547]/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#111722] border border-[#f2ca50]/30 text-[#f2ca50] flex items-center justify-center font-bold text-xs">
                  {actionMember.prenom?.[0] || 'M'}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#e5e9f2]">
                    {actionMember.prenom} {actionMember.nom}
                  </h3>
                  <p className="text-xs text-[#f2ca50] font-mono">{actionMember.matricule}</p>
                </div>
              </div>
              <button
                onClick={() => setActionMember(null)}
                className="p-1.5 rounded-lg text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1b2332]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Menu d'actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setActionMember(null);
                  navigate(`/members/${actionMember.matricule || actionMember.id}`);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547] text-left text-[#e5e9f2] transition"
              >
                <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">visibility</span>
                <div>
                  <span className="font-semibold block">Voir fiche 360°</span>
                  <span className="text-[10px] text-[#9ca7b8]">Parcours complet &amp; réseau</span>
                </div>
              </button>

              {isEditor && (
                <button
                  onClick={() => {
                    setActionMember(null);
                    navigate(`/members/${actionMember.matricule || actionMember.id}/edit`);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547] text-left text-[#e5e9f2] transition"
                >
                  <span className="material-symbols-outlined text-amber-400 text-[20px]">edit</span>
                  <div>
                    <span className="font-semibold block">Modifier</span>
                    <span className="text-[10px] text-[#9ca7b8]">État civil, contacts</span>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setActionMember(null);
                  navigate(`/network?search=${encodeURIComponent(actionMember.matricule)}`);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547] text-left text-[#e5e9f2] transition"
              >
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">hub</span>
                <div>
                  <span className="font-semibold block">Entraide &amp; Métiers</span>
                  <span className="text-[10px] text-[#9ca7b8]">Compétences &amp; services</span>
                </div>
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setActionMember(null);
                    navigate(`/users?action=create&member_id=${actionMember.id}`);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547] text-left text-[#e5e9f2] transition"
                >
                  <span className="material-symbols-outlined text-blue-400 text-[20px]">manage_accounts</span>
                  <div>
                    <span className="font-semibold block">Compte Utilisateur</span>
                    <span className="text-[10px] text-[#9ca7b8]">Lier un accès d'authentification</span>
                  </div>
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => handleSoftDelete(actionMember)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151c28] hover:bg-orange-500/15 border border-[#2b3547] text-left text-orange-400 transition"
                >
                  <span className="material-symbols-outlined text-orange-400 text-[20px]">archive</span>
                  <div>
                    <span className="font-semibold block">Archiver (Soft Delete)</span>
                    <span className="text-[10px] text-[#9ca7b8]">Désactivation réversible</span>
                  </div>
                </button>
              )}

              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setHardDeleteTarget(actionMember);
                    setHardDeleteInput('');
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-left text-red-400 transition sm:col-span-2"
                >
                  <span className="material-symbols-outlined text-red-400 text-[20px]">delete_forever</span>
                  <div>
                    <span className="font-semibold block">Supprimer définitivement (Hard Delete)</span>
                    <span className="text-[10px] text-red-300/80">Super Admin uniquement • Exige saisie du matricule</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL DE SÉCURITÉ SUPPRESSION PHYSIQUE DÉFINITIVE (SUPER ADMIN) */}
      {/* ========================================================================= */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-[#140b0e] border border-red-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <span className="material-symbols-outlined text-[32px]">warning</span>
              <div>
                <h3 className="font-headline-sm text-base font-bold">Suppression Définitive Irréversible</h3>
                <p className="text-[11px] text-red-300">Base de données PostgreSQL Neon</p>
              </div>
            </div>

            <p className="text-xs text-[#e5e9f2]/90 leading-relaxed">
              Vous êtes sur le point de supprimer physiquement de la base le membre{' '}
              <strong className="text-red-300 font-bold">{hardDeleteTarget.prenom} {hardDeleteTarget.nom}</strong> ({hardDeleteTarget.matricule}).
              Cette action détruira définitivement son profil ainsi que ses relations associées.
            </p>

            <div className="p-3 rounded-xl bg-[#201015] border border-red-500/30 text-xs space-y-2">
              <label className="text-[11px] text-[#9ca7b8] block">
                Pour confirmer, veuillez saisir exactement le matricule :{' '}
                <strong className="text-[#f2ca50] font-mono">{hardDeleteTarget.matricule}</strong>
              </label>
              <input
                type="text"
                value={hardDeleteInput}
                onChange={(e) => setHardDeleteInput(e.target.value)}
                placeholder={hardDeleteTarget.matricule}
                className="w-full bg-[#0d0709] border border-red-500/40 rounded-lg px-3 py-2 text-xs text-[#e5e9f2] font-mono outline-none focus:border-red-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setHardDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#1b2332] text-[#9ca7b8] hover:text-[#e5e9f2] text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={hardDeleteInput.trim() !== hardDeleteTarget.matricule || isDeleting}
                onClick={handleHardDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              >
                {isDeleting && <span className="material-symbols-outlined text-[15px] animate-spin">refresh</span>}
                <span>Confirmer la suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
