import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getMembers, deleteMember, hardDeleteMember } from '../services/memberService';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MemberAvatar } from '../components/MemberAvatar';

export const MembersDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const { t, tControlled } = useLanguage();
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
    if (!sit) return 'Membre';
    const translated = tControlled('situation', sit);
    if (translated && translated !== sit) return translated;
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

  // Normalisation canonique pour tri alphabétique strict A-Z (accents, espaces, casse)
  const normalizeForSort = (str: string) =>
    (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

  // Distinction protocolaire : Guide Spirituel & Fondateur (1), Président de la Dahirah (2), et Disciples
  const founderMember = members.find((m) => m.isFounder || m.institutionalRoleCode === 'FOUNDER');
  const presidentMember = members.find((m) => m.isPresident || m.institutionalRoleCode === 'PRESIDENT');
  const communityMembers = members
    .filter(
      (m) =>
        !m.isFounder &&
        !m.isPresident &&
        m.institutionalRoleCode !== 'FOUNDER' &&
        m.institutionalRoleCode !== 'PRESIDENT'
    )
    .sort((a, b) => {
      const nameA = normalizeForSort(`${a.prenom} ${a.nom}`);
      const nameB = normalizeForSort(`${b.prenom} ${b.nom}`);
      return nameA.localeCompare(nameB, 'fr');
    });

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
    if (
      !window.confirm(
        t('softDeleteConfirmPrompt', {
          name: `${member.prenom} ${member.nom}`,
          matricule: member.matricule,
        })
      )
    ) {
      return;
    }
    try {
      await deleteMember(member.id);
      setNotification({
        type: 'success',
        message: t('memberArchivedSuccess', { matricule: member.matricule }),
      });
      setActionMember(null);
      fetchMembers();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || t('error') });
    }
  };

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteTarget) return;
    if (hardDeleteInput.trim() !== hardDeleteTarget.matricule) {
      setNotification({ type: 'error', message: t('matriculeMismatchError') });
      return;
    }

    setIsDeleting(true);
    try {
      await hardDeleteMember(hardDeleteTarget.id);
      setNotification({
        type: 'success',
        message: t('memberHardDeletedSuccess', { matricule: hardDeleteTarget.matricule }),
      });
      setHardDeleteTarget(null);
      setHardDeleteInput('');
      setActionMember(null);
      fetchMembers();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || t('error') });
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
            {t('directoryTitle')}
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">
            {t('directorySubtitle')}
          </p>
        </div>

        {isEditor && (
          <Link
            to="/members/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 font-bold shadow-[0_4px_18px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition text-xs"
          >
            <span className="material-symbols-outlined text-[18px] font-bold">person_add</span>
            <span>+ {t('newEnrollment')}</span>
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
            placeholder={t('searchPlaceholder')}
            className="w-full bg-[#06090e] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none border border-[#2b3547] focus:border-[#f2ca50] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-[#9ca7b8] whitespace-nowrap pl-2">
            <strong className="text-[#f2ca50] ltr-tech">{members.length}</strong> {t('activeMembers')}
          </span>
        </div>
      </div>

      {filterSituation && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e2638] border border-[#f2ca50]/40 text-xs text-[#e5e9f2] w-fit shadow-sm">
          <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">filter_alt</span>
          <span>{t('filterApplied')} : <strong className="text-[#f2ca50]">{getSituationLabel(filterSituation)}</strong> ({totalCount})</span>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('situation');
              setSearchParams(p);
            }}
            className="ml-2 px-2 py-0.5 rounded-lg bg-[#111722] hover:bg-[#2b3547] text-[#9ca7b8] hover:text-[#f2ca50] transition flex items-center gap-1 text-[11px] border border-[#2b3547]"
            title={t('clearFilter')}
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            <span>{t('allSituations')}</span>
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
      {/* 0. BLOC PROTOCOLAIRE : GUIDE SPIRITUEL & FONDATEUR (Position 1) */}
      {/* ========================================================================= */}
      {!isLoading && founderMember && (
        <div className="relative rounded-2xl bg-gradient-to-br from-[#0e1624] via-[#121c2c] to-[#0c1420] border border-[#c8a44d]/40 shadow-xl p-5 sm:p-6 overflow-hidden space-y-4">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c8a44d] to-transparent"></div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <MemberAvatar
                photoUrl={founderMember.photo}
                name={`${founderMember.prenom} ${founderMember.nom}`}
                matricule={founderMember.matricule}
                size="lg"
                className="border-2 border-[#c8a44d]/50 shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#c8a44d]/15 border border-[#c8a44d]/40 text-[#c8a44d] text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[14px]">stars</span>
                    {t('founderBadge')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#1b2636] border border-[#2b3547] text-[#9ca7b8] text-[11px] font-mono font-semibold ltr-tech">
                    {founderMember.matricule}
                  </span>
                </div>

                <h2 className="font-headline-lg text-lg sm:text-xl font-bold text-[#e5e9f2] leading-snug">
                  {founderMember.prenom} {founderMember.nom}
                </h2>
                <p className="text-xs sm:text-sm font-headline-sm text-[#c8a44d] font-medium">
                  {founderMember.nomArabe || 'محمد نور الدين نياس'}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#c8a44d]/15 border border-[#c8a44d]/30 text-[#c8a44d] text-[10px] font-bold self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c8a44d]"></span>
              {tControlled('member_status', founderMember.statutCompte) || 'ACTIF'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs pt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1b2636] text-[#e5e9f2] border border-[#2b3547]">
              <span className="material-symbols-outlined text-[15px] text-[#c8a44d]">verified_user</span>
              <span>{founderMember.professionActuelle || 'Expert en sciences politiques islamiques & relations internationales'}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1b2636] text-[#9ca7b8] border border-[#2b3547]">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">location_on</span>
              <span>{founderMember.ville || 'Dakar'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#2b3547]/40 gap-2">
            <Link
              to={`/members/${founderMember.matricule || founderMember.id}`}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-[#c8a44d]/15 hover:bg-[#c8a44d]/25 text-[#c8a44d] hover:text-[#f3d37a] border border-[#c8a44d]/40 text-xs font-bold transition shadow-sm group"
            >
              <span>{t('viewProfile')}</span>
              <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </Link>

            <div className="flex items-center gap-2">
              {isEditor && (
                <Link
                  to={`/members/${founderMember.matricule || founderMember.id}/edit`}
                  className="p-2 rounded-xl bg-[#242e40]/70 hover:bg-[#c8a44d] hover:text-slate-950 text-[#9ca7b8] transition flex items-center justify-center"
                  title={t('editMember')}
                >
                  <span className="material-symbols-outlined text-[17px]">edit</span>
                </Link>
              )}
              <button
                onClick={() => setActionMember(founderMember)}
                className="p-2 rounded-xl bg-[#1b2332] hover:bg-[#c8a44d] hover:text-slate-950 text-[#e5e9f2] border border-[#2b3547] transition flex items-center justify-center cursor-pointer"
                title={t('contextActions')}
              >
                <span className="material-symbols-outlined text-[17px]">more_vert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 0.5. BLOC PROTOCOLAIRE : PRÉSIDENT DE LA DAHIRAH (Position 2) */}
      {/* Rendu UNIQUEMENT si un membre a le statut de président actif */}
      {/* ========================================================================= */}
      {!isLoading && presidentMember && (
        <div className="relative rounded-2xl bg-gradient-to-br from-[#0c1a24] via-[#10242f] to-[#0a171e] border border-emerald-500/40 shadow-xl p-5 sm:p-6 overflow-hidden space-y-4">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <MemberAvatar
                photoUrl={presidentMember.photo}
                name={`${presidentMember.prenom} ${presidentMember.nom}`}
                matricule={presidentMember.matricule}
                size="lg"
                className="border-2 border-emerald-500/50 shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                    {t('presidentBadge')}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#1b2636] border border-[#2b3547] text-[#9ca7b8] text-[11px] font-mono font-semibold ltr-tech">
                    {presidentMember.matricule}
                  </span>
                </div>

                <h2 className="font-headline-lg text-lg sm:text-xl font-bold text-[#e5e9f2] leading-snug">
                  {presidentMember.prenom} {presidentMember.nom}
                </h2>
                {presidentMember.nomArabe && (
                  <p className="text-xs sm:text-sm font-headline-sm text-emerald-400 font-medium">
                    {presidentMember.nomArabe}
                  </p>
                )}
                <p className="text-xs text-[#9ca7b8]">
                  {t('presidentCardSubtitle')}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {tControlled('member_status', presidentMember.statutCompte) || 'ACTIF'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs pt-1">
            {presidentMember.professionActuelle && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1b2636] text-[#e5e9f2] border border-[#2b3547]">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">verified_user</span>
                <span>{presidentMember.professionActuelle}</span>
              </span>
            )}
            {presidentMember.ville && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1b2636] text-[#9ca7b8] border border-[#2b3547]">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">location_on</span>
                <span>{presidentMember.ville}</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#2b3547]/40 gap-2">
            <Link
              to={`/members/${presidentMember.matricule || presidentMember.id}`}
              className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm group"
            >
              <span>{t('viewProfile')}</span>
              <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </Link>

            <div className="flex items-center gap-2">
              {isEditor && (
                <Link
                  to={`/members/${presidentMember.matricule || presidentMember.id}/edit`}
                  className="p-2 rounded-xl bg-[#242e40]/70 hover:bg-emerald-400 hover:text-slate-950 text-[#9ca7b8] transition flex items-center justify-center"
                  title={t('editMember')}
                >
                  <span className="material-symbols-outlined text-[17px]">edit</span>
                </Link>
              )}
              <button
                onClick={() => setActionMember(presidentMember)}
                className="p-2 rounded-xl bg-[#1b2332] hover:bg-emerald-400 hover:text-slate-950 text-[#e5e9f2] border border-[#2b3547] transition flex items-center justify-center cursor-pointer"
                title={t('contextActions')}
              >
                <span className="material-symbols-outlined text-[17px]">more_vert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SÉPARATEUR PROTOCOLAIRE : MEMBRES DE LA DAHIRAH */}
      {/* ========================================================================= */}
      {!isLoading && (founderMember || presidentMember || communityMembers.length > 0) && (
        <div className="flex items-center justify-between pt-2 pb-1 border-b border-[#2b3547]/50">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-sm text-xs font-bold uppercase tracking-wider text-[#e5e9f2]">
              {t('dahirahMembers')}
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#1b2332] text-[#c8a44d] text-[11px] font-mono font-bold border border-[#2b3547] ltr-tech">
              {communityMembers.length}
            </span>
          </div>
          <span className="text-[11px] text-[#788294] hidden sm:inline italic">
            {t('alphabeticalOrder')}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. VUE MOBILE-FIRST (< md / < 768px) : CARTES VERTICALES SANS TABLE HORIZONTALE */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3.5">
        {isLoading ? (
          <div className="p-10 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-center text-[#9ca7b8] space-y-2">
            <span className="material-symbols-outlined text-[28px] animate-spin text-[#f2ca50]">refresh</span>
            <p className="text-xs">{t('loading')}</p>
          </div>
        ) : communityMembers.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 text-center text-[#9ca7b8] text-xs">
            {t('noMembersFound')}
          </div>
        ) : (
          communityMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-lg space-y-3 transition hover:border-[#f2ca50]/40"
            >
              {/* Ligne 1 : Avatar, Nom, Matricule et Badge Statut */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <MemberAvatar
                    photoUrl={member.photo}
                    name={`${member.prenom} ${member.nom}`}
                    matricule={member.matricule}
                    size="md"
                  />
                  <div className="flex flex-col min-w-0">
                    <Link
                      to={`/members/${member.matricule || member.id}`}
                      className="font-semibold text-sm text-[#e5e9f2] hover:text-[#f2ca50] transition truncate"
                    >
                      {member.prenom} {member.nom}
                    </Link>
                    <span className="text-[11px] text-[#f2ca50] font-mono tracking-wide ltr-tech">{member.matricule}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-[10px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>
                  {tControlled('member_status', member.statutCompte) || 'ACTIF'}
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
                  <span>{t('viewProfile')}</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </Link>

                {isEditor && (
                  <Link
                    to={`/members/${member.matricule || member.id}/edit`}
                    className="p-2 rounded-xl bg-[#242e40]/70 hover:bg-[#f2ca50] hover:text-slate-950 text-[#9ca7b8] transition flex items-center justify-center"
                    title={t('editMember')}
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Link>
                )}

                {/* Bouton d'actions contextuelles */}
                <button
                  onClick={() => setActionMember(member)}
                  className="p-2 rounded-xl bg-[#1b2332] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] border border-[#2b3547] transition flex items-center justify-center cursor-pointer"
                  title={t('modalActionsTitle')}
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
                <th className="py-3.5 px-5">{t('members')} &amp; Matricule</th>
                <th className="py-3.5 px-4">{t('situation')} &amp; {t('profession')}</th>
                <th className="py-3.5 px-4">{t('location')}</th>
                <th className="py-3.5 px-4">{t('status')}</th>
                <th className="py-3.5 px-5 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3547]/20">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9ca7b8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-[#f2ca50]">refresh</span>
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : communityMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9ca7b8]">
                    {t('noMembersFound')}
                  </td>
                </tr>
              ) : (
                communityMembers.map((member) => (
                  <tr key={member.id} className="group hover:bg-[#1b2332]/60 transition-colors">
                    
                    {/* Identité & Matricule */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <MemberAvatar
                          photoUrl={member.photo}
                          name={`${member.prenom} ${member.nom}`}
                          matricule={member.matricule}
                          size="sm"
                        />
                        <div className="flex flex-col min-w-0">
                          <Link
                            to={`/members/${member.matricule || member.id}`}
                            className="font-semibold text-sm text-[#e5e9f2] group-hover:text-[#f2ca50] transition-colors"
                          >
                            {member.prenom} {member.nom}
                          </Link>
                          <span className="text-[11px] text-[#f2ca50] font-mono ltr-tech">{member.matricule}</span>
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
                        {tControlled('member_status', member.statutCompte) || 'ACTIF'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/members/${member.matricule || member.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] text-xs font-semibold transition"
                          title={t('viewProfile')}
                        >
                          <span>{t('viewProfile')}</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>

                        {isEditor && (
                          <Link
                            to={`/members/${member.matricule || member.id}/edit`}
                            className="p-1.5 rounded-lg bg-[#242e40]/70 hover:bg-[#ffb95f] hover:text-slate-950 text-[#9ca7b8] transition"
                            title={t('editMember')}
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </Link>
                        )}

                        <button
                          onClick={() => setActionMember(member)}
                          className="p-1.5 rounded-lg bg-[#1b2332] hover:bg-[#f2ca50] hover:text-slate-950 text-[#9ca7b8] border border-[#2b3547] transition"
                          title={t('contextActions')}
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
                <MemberAvatar
                  photoUrl={actionMember.photo}
                  name={`${actionMember.prenom} ${actionMember.nom}`}
                  matricule={actionMember.matricule}
                  size="sm"
                />
                <div>
                  <h3 className="text-sm font-semibold text-[#e5e9f2]">
                    {actionMember.prenom} {actionMember.nom}
                  </h3>
                  <p className="text-xs text-[#f2ca50] font-mono ltr-tech">{actionMember.matricule}</p>
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
                  <span className="font-semibold block">{t('actionView360')}</span>
                  <span className="text-[10px] text-[#9ca7b8]">{t('actionView360Desc')}</span>
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
                    <span className="font-semibold block">{t('editMember')}</span>
                    <span className="text-[10px] text-[#9ca7b8]">{t('actionEditDesc')}</span>
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
                  <span className="font-semibold block">{t('breadcrumbNetwork')}</span>
                  <span className="text-[10px] text-[#9ca7b8]">{t('actionNetworkDesc')}</span>
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
                    <span className="font-semibold block">{t('actionUserAccount')}</span>
                    <span className="text-[10px] text-[#9ca7b8]">{t('actionUserAccountDesc')}</span>
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
                    <span className="font-semibold block">{t('actionArchive')}</span>
                    <span className="text-[10px] text-[#9ca7b8]">{t('actionArchiveDesc')}</span>
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
                    <span className="font-semibold block">{t('actionHardDelete')}</span>
                    <span className="text-[10px] text-red-300/80">{t('actionHardDeleteDesc')}</span>
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
                <h3 className="font-headline-sm text-base font-bold">{t('hardDeleteModalTitle')}</h3>
                <p className="text-[11px] text-red-300">{t('hardDeleteDatabaseNotice')}</p>
              </div>
            </div>

            <p className="text-xs text-[#e5e9f2]/90 leading-relaxed">
              {t('hardDeleteWarningMessage', {
                name: `${hardDeleteTarget.prenom} ${hardDeleteTarget.nom}`,
                matricule: hardDeleteTarget.matricule,
              })}
            </p>

            <div className="p-3 rounded-xl bg-[#201015] border border-red-500/30 text-xs space-y-2">
              <label className="text-[11px] text-[#9ca7b8] block">
                {t('hardDeletePrompt', { matricule: hardDeleteTarget.matricule })}
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
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={hardDeleteInput.trim() !== hardDeleteTarget.matricule || isDeleting}
                onClick={handleHardDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              >
                {isDeleting && <span className="material-symbols-outlined text-[15px] animate-spin">refresh</span>}
                <span>{t('confirmHardDeleteBtn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
