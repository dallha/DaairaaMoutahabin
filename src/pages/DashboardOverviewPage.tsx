import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MemberAvatar } from '../components/MemberAvatar';
import { DashboardStats, getDashboardStats } from '../services/dashboardService';
import { getMembers, getMemberById } from '../services/memberService';
import { Member } from '../types';

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [founder, setFounder] = useState<Member | null>(null);
  const [president, setPresident] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [statsData, membersData, founderData] = await Promise.allSettled([
          getDashboardStats(),
          getMembers(50),
          getMemberById('DAMF-0001'),
        ]);

        if (isMounted) {
          if (statsData.status === 'fulfilled') {
            setStats(statsData.value);
          } else {
            console.warn('Erreur chargement stats Django:', statsData.reason);
            setError('Liaison API Django en cours d’initialisation. Données locales affichées.');
          }

          if (membersData.status === 'fulfilled') {
            const list = membersData.value.members || [];
            setRecentMembers(list.slice(0, 5));
            const foundPresident = list.find(
              (m) => m.isPresident || m.institutionalRoleCode === 'PRESIDENT'
            );
            setPresident(foundPresident || null);
          }

          if (founderData.status === 'fulfilled') {
            setFounder(founderData.value);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur lors du chargement des données.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const rawMetrics = (stats as any)?.data?.metrics ?? stats?.metrics;
  const totalMembers = rawMetrics?.total_active_members ?? recentMembers.length;
  const totalPupils = rawMetrics?.total_pupils ?? 5;
  const totalStudents = rawMetrics?.total_students ?? 6;
  const totalLearners = rawMetrics?.total_learners ?? (totalPupils + totalStudents);
  const totalProfessionals = rawMetrics?.total_professionals ?? 0;
  const totalJobSeekers = rawMetrics?.total_job_seekers ?? 0;
  const totalArchived = rawMetrics?.total_archived_members ?? 0;
  const topRoles = (stats as any)?.data?.top_roles ?? stats?.top_roles ?? [];
  const recentAuditLogs = (stats as any)?.data?.recent_audit_logs ?? stats?.recent_audit_logs ?? [];

  const rawImpact = (stats as any)?.data?.impact_metrics ?? stats?.impact_metrics;
  const needsTotal = rawImpact?.needs_total ?? 0;
  const needsInProgress = rawImpact?.needs_in_progress ?? 0;
  const needsResolved = rawImpact?.needs_resolved ?? 0;
  const relationsActive = rawImpact?.relations_active ?? 0;
  const supportRate = rawImpact?.support_rate ?? 0;
  const resolutionRate = rawImpact?.resolution_rate ?? 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Cockpit Header Banner */}
      <section className="relative rounded-2xl bg-gradient-to-r from-[#0d131d] via-[#131b26] to-[#0f1622] p-6 lg:p-7 border border-[#2b3547]/80 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/70 to-transparent"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/20 text-[#f2ca50] text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] animate-pulse"></span>
                {t('dashboardConsoleBadge')}
              </span>
              <span className="text-xs text-[#9ca7b8] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#f2ca50]">cloud_done</span>
                {t('dbConnectedNeon')}
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl lg:text-3xl font-medium tracking-tight text-[#e5e9f2]">
              {t('dashboardGovernanceTitle')}
            </h1>
            <p className="text-xs lg:text-sm text-[#f2ca50]/90 font-headline-sm italic">
              {t('appName')} <span className="text-[#9ca7b8] not-italic font-body-md font-normal">• {t('appSubtitle')}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/members"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242e40] text-[#f2ca50] hover:bg-[#2b3547] text-xs font-semibold border border-[#f2ca50]/30 transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>{t('accessDirectoryBtn')}</span>
            </Link>
            {user?.role === 'superadmin' && (
              <Link
                to="/audit"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2ca50] text-slate-950 hover:bg-[#e9c349] text-xs font-bold transition shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">shield</span>
                <span>{t('auditLogBtn')}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 2. Bloc Protocolaire : Guide Spirituel & Fondateur (Position 1) */}
      <section className="relative rounded-2xl bg-gradient-to-br from-[#0e1624] via-[#121c2c] to-[#0c1420] p-6 lg:p-7 border border-[#c8a44d]/40 shadow-xl overflow-hidden">
        {/* Liseré or institutionnel sobre */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c8a44d] to-transparent"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5 max-w-3xl">
            {/* Avatar Officiel du Shaykh */}
            <MemberAvatar
              photoUrl={founder?.photo}
              name={founder ? `${founder.prenom} ${founder.nom}` : 'Shaykh Muhammad Nūruddin'}
              matricule={founder?.matricule || 'DAMF-0001'}
              size="lg"
            />

            <div className="space-y-2.5">
              {/* Badge protocolaire & Matricule */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c8a44d]/15 border border-[#c8a44d]/40 text-[#c8a44d] text-[11px] font-bold tracking-wider uppercase">
                  <span className="material-symbols-outlined text-[15px]">stars</span>
                  {t('founderHighlightBadge')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#1b2636] border border-[#2b3547] text-[#9ca7b8] text-[11px] font-mono font-semibold ltr-tech">
                  {founder?.matricule || 'DAMF-0001'}
                </span>
              </div>

              {/* Identité & Nom Arabe */}
              <div>
                <h2 className="font-headline-lg text-xl sm:text-2xl font-bold text-[#e5e9f2] tracking-tight">
                  {founder ? `${founder.prenom} ${founder.nom}` : 'Shaykh Muhammad Nūruddin Ibn Shaykh Muhammadul Amīn Ñas'}
                </h2>
                <p className="text-sm font-headline-sm text-[#c8a44d] mt-1 font-medium tracking-wide">
                  {founder?.nomArabe || 'محمد نور الدين نياس'}
                </p>
              </div>

              {/* Disciplines, Expertise & Formation Al-Azhar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-[#9ca7b8]">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#c8a44d] text-[18px] shrink-0 mt-0.5">school</span>
                  <div>
                    <span className="text-[#e5e9f2] font-medium block">{t('founderEducation').split('—')[0]}</span>
                    <span>{t('founderEducation').split('—')[1] || t('founderEducation')}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#c8a44d] text-[18px] shrink-0 mt-0.5">verified_user</span>
                  <div>
                    <span className="text-[#e5e9f2] font-medium block">{t('founderExpertise').split('islamiques')[0]}</span>
                    <span>{t('founderExpertise')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bouton d'accès direct vers la fiche complète */}
          <div className="shrink-0 flex items-center md:self-end">
            <Link
              to={`/members/${founder?.matricule || founder?.id || 'DAMF-0001'}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c8a44d]/15 hover:bg-[#c8a44d]/25 text-[#c8a44d] hover:text-[#f3d37a] border border-[#c8a44d]/40 text-xs font-bold transition shadow-sm group"
            >
              <span>{t('accessProfile360')}</span>
              <span className={`material-symbols-outlined text-[16px] transition-transform ${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2.5. Bloc Protocolaire : Direction Exécutive & Présidence (Position 2) */}
      {!isLoading && president && (
        <section className="relative rounded-2xl bg-gradient-to-br from-[#0c1a24] via-[#10242f] to-[#0a171e] p-6 lg:p-7 border border-emerald-500/40 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5 max-w-3xl">
              <MemberAvatar
                photoUrl={president.photo}
                name={`${president.prenom} ${president.nom}`}
                matricule={president.matricule}
                size="lg"
                className="border-2 border-emerald-500/50 shrink-0"
              />

              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[15px]">workspace_premium</span>
                    {t('presidentHighlightBadge')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1b2636] border border-[#2b3547] text-[#9ca7b8] text-[11px] font-mono font-semibold ltr-tech">
                    {president.matricule}
                  </span>
                </div>

                <div>
                  <h2 className="font-headline-lg text-xl sm:text-2xl font-bold text-[#e5e9f2] tracking-tight">
                    {president.prenom} {president.nom}
                  </h2>
                  {president.nomArabe && (
                    <p className="text-sm font-headline-sm text-emerald-400 mt-1 font-medium tracking-wide">
                      {president.nomArabe}
                    </p>
                  )}
                  <p className="text-xs text-[#9ca7b8] mt-1">
                    {t('presidentCardSubtitle')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  {president.professionActuelle && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1b2636] text-[#e5e9f2] border border-[#2b3547]">
                      <span className="material-symbols-outlined text-[15px] text-emerald-400">verified_user</span>
                      <span>{president.professionActuelle}</span>
                    </span>
                  )}
                  {president.ville && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1b2636] text-[#9ca7b8] border border-[#2b3547]">
                      <span className="material-symbols-outlined text-[15px] text-emerald-400">location_on</span>
                      <span>{president.ville}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center md:self-end">
              <Link
                to={`/members/${president.matricule || president.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm group"
              >
                <span>{t('accessProfile360')}</span>
                <span className={`material-symbols-outlined text-[16px] transition-transform ${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`}>arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. La Dahirah en Chiffres (Métriques Clés à Hiérarchie Allégée) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-headline-sm text-sm font-semibold uppercase tracking-wider text-[#9ca7b8] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[18px]">equalizer</span>
            {t('dahirahInNumbersTitle')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          
          {/* Metric 1 : Total Membres Actifs */}
          <Link
            to="/members"
            className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#f2ca50]/60 hover:bg-[#151c2a] transition-all flex flex-col justify-between group overflow-hidden cursor-pointer shadow-lg"
          >
            <div className="absolute -right-3 -top-3 p-3 text-[#f2ca50]/5 group-hover:text-[#f2ca50]/15 transition-colors pointer-events-none">
              <span className="material-symbols-outlined text-[72px]">groups_3</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">{t('totalActiveMembersLabel')}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] text-[10px] font-bold border border-[#f2ca50]/20">
                  <span className="material-symbols-outlined text-[12px]">verified</span> PostgreSQL
                </span>
              </div>
              <div className="font-headline-lg text-3xl sm:text-4xl font-semibold tracking-tight text-[#e5e9f2] my-1">
                {isLoading ? '...' : totalMembers}
              </div>
            </div>
            <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
              <span>{t('registeredOfficially')}</span>
              <span className="text-[#f2ca50] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                {t('viewAllLink')}
              </span>
            </div>
          </Link>

          {/* Metric 2 : Professionnels & Cadres */}
          <Link
            to="/members?situation=EMPLOYEE"
            className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#f2ca50]/60 hover:bg-[#151c2a] transition-all flex flex-col justify-between group overflow-hidden cursor-pointer shadow-lg"
          >
            <div className="absolute -right-3 -top-3 p-3 text-[#f2ca50]/5 group-hover:text-[#f2ca50]/15 transition-colors pointer-events-none">
              <span className="material-symbols-outlined text-[72px]">work</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">{t('professionalsLabel')}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#242e40] text-[#f2ca50] font-bold text-[10px] border border-[#f2ca50]/20">
                  {t('executivesAndTrades')}
                </span>
              </div>
              <div className="font-headline-lg text-3xl sm:text-4xl font-semibold tracking-tight text-[#f2ca50] my-1">
                {isLoading ? '...' : totalProfessionals}
              </div>
            </div>
            <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
              <span>{t('employeesAndFreelancers')}</span>
              <span className="text-[#f2ca50] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                {t('filterCount', { count: totalProfessionals })}
              </span>
            </div>
          </Link>

          {/* Metric 3 : Élèves & Étudiants */}
          <Link
            to="/members?situation=STUDENT"
            className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#ffb95f]/60 hover:bg-[#151c2a] transition-all flex flex-col justify-between group overflow-hidden cursor-pointer shadow-lg"
          >
            <div className="absolute -right-3 -top-3 p-3 text-[#ffb95f]/5 group-hover:text-[#ffb95f]/15 transition-colors pointer-events-none">
              <span className="material-symbols-outlined text-[72px]">school</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">{t('pupilsAndStudents')}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] font-bold text-[10px] border border-[#ffb95f]/30">
                  {t('youthAndKnowledge')}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 my-1 flex-wrap">
                <span className="font-headline-lg text-3xl sm:text-4xl font-semibold tracking-tight text-[#ffb95f]">
                  {isLoading ? '...' : totalLearners}
                </span>
                <span className="text-xs text-[#9ca7b8] font-medium bg-[#1e2638] px-2 py-0.5 rounded-md border border-[#2b3547]/50">
                  {t('pupilsPlusStudents', { pupils: totalPupils, students: totalStudents })}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
              <span>{t('learnersAndDaaras')}</span>
              <span className="text-[#ffb95f] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                {t('filterCount', { count: totalLearners })}
              </span>
            </div>
          </Link>

          {/* Metric 4 : Entraide & Solidarité Résolue */}
          <Link
            to="/network"
            className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-emerald-500/50 hover:bg-[#151c2a] transition-all flex flex-col justify-between group overflow-hidden cursor-pointer shadow-lg"
          >
            <div className="absolute -right-3 -top-3 p-3 text-emerald-500/5 group-hover:text-emerald-500/15 transition-colors pointer-events-none">
              <span className="material-symbols-outlined text-[72px]">handshake</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">{t('fraternalMutualAid')}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  {resolutionRate}% {t('impactResolutionRate')}
                </span>
              </div>
              <div className="font-headline-lg text-3xl sm:text-4xl font-semibold tracking-tight text-emerald-400 my-1">
                {isLoading ? '...' : (needsResolved || relationsActive)}
              </div>
            </div>
            <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
              <span>{t('mutualAidsCompleted')}</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                {t('viewAllLink')}
              </span>
            </div>
          </Link>

        </div>
      </section>

      {/* 4. Bento 1 : 🤝 Vie de la Dahirah & Entraide (Pour tous les disciples) */}
      <section className="rounded-2xl bg-[#111722]/80 border border-[#2b3547]/60 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[22px]">diversity_3</span>
            <div>
              <h2 className="font-headline-sm text-base font-semibold text-[#e5e9f2]">
                {t('communityLifeTitle')}
              </h2>
              <p className="text-[11px] text-[#9ca7b8] hidden sm:block">
                {t('communityLifeSubtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Link
            to="/network"
            className="flex items-center gap-3 p-4 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/60 hover:border-[#f2ca50]/50 transition group shadow-sm"
          >
            <div className="w-11 h-11 rounded-xl bg-[#f2ca50]/15 text-[#f2ca50] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-[24px]">hub</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#e5e9f2] group-hover:text-[#f2ca50] truncate">
                {t('breadcrumbNetwork')}
              </span>
              <span className="text-xs text-[#9ca7b8] truncate">{t('findSkillsServicesDesc')}</span>
            </div>
          </Link>

          <Link
            to="/members"
            className="flex items-center gap-3 p-4 rounded-xl bg-[#151c28] hover:bg-[#1b2332] border border-[#2b3547]/60 hover:border-emerald-400/50 transition group shadow-sm"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
              <span className="material-symbols-outlined text-[24px]">groups</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#e5e9f2] group-hover:text-emerald-400 truncate">
                {t('viewDirectory')}
              </span>
              <span className="text-xs text-[#9ca7b8] truncate">{t('registeredOfficially')}</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#151c28] border border-[#2b3547]/40 shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">mosque</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-[#e5e9f2] truncate">
                {t('hadaratWazifaFriday')}
              </span>
              <span className="text-xs text-sky-300 truncate">{t('hadaratFridayTime')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Bento 2 : ⚙️ Espace Administration & Pilotage (Strictement pour les Admins) */}
      {['admin', 'superadmin', 'agent'].includes(user?.role || '') && (
        <section className="rounded-2xl bg-[#131b28]/85 border border-[#3b475c]/70 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-[22px]">admin_panel_settings</span>
              <div>
                <h2 className="font-headline-sm text-base font-semibold text-[#e5e9f2]">
                  {t('adminConsoleTitle')}
                </h2>
                <p className="text-[11px] text-[#9ca7b8] hidden sm:block">
                  {t('adminConsoleSubtitle')}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[10px] font-bold border border-purple-500/30 uppercase tracking-wider">
              {user?.role === 'superadmin' ? t('roleSuperAdmin') : t('roleAdmin')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Link
              to="/members/new"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[#162030] hover:bg-[#1e2a3f] border border-[#2b3547]/80 hover:border-[#f2ca50]/50 transition group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#f2ca50]/15 text-[#f2ca50] flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <span className="material-symbols-outlined text-[20px]">person_add</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#e5e9f2] group-hover:text-[#f2ca50] truncate">
                  {t('newEnrollmentAction')}
                </span>
                <span className="text-[10px] text-[#9ca7b8] truncate">{t('generateMatriculeDesc')}</span>
              </div>
            </Link>

            {['admin', 'superadmin'].includes(user?.role || '') && (
              <Link
                to="/users?action=create"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#162030] hover:bg-[#1e2a3f] border border-[#2b3547]/80 hover:border-blue-400/50 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#e5e9f2] group-hover:text-blue-400 truncate">
                    {t('createAccessAccountAction')}
                  </span>
                  <span className="text-[10px] text-[#9ca7b8] truncate">{t('linkUserMemberDesc')}</span>
                </div>
              </Link>
            )}

            {['admin', 'superadmin'].includes(user?.role || '') && (
              <Link
                to="/audit"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#162030] hover:bg-[#1e2a3f] border border-[#2b3547]/80 hover:border-purple-400/50 transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#e5e9f2] group-hover:text-purple-400 truncate">
                      {t('securityLogAction')}
                    </span>
                    {recentAuditLogs.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[#f2ca50] animate-pulse shrink-0"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#9ca7b8] truncate">
                    {recentAuditLogs.length > 0 ? `${recentAuditLogs.length} ${t('executiveSecurityEvents')}` : t('immutableNeonTraceDesc')}
                  </span>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 2.6 Baromètre d'Impact & Solidarité */}
      <section className="relative rounded-2xl bg-gradient-to-br from-[#0e1625] via-[#121c2c] to-[#0d1521] border border-[#26354d] p-6 lg:p-7 shadow-2xl overflow-hidden space-y-6">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/60 to-transparent"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-[11px] font-bold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">vital_signs</span>
                {t('confraternalBarometerBadge')}
              </span>
              <span className="text-[11px] text-[#9ca7b8]">• {t('phaseBadge')}</span>
            </div>
            <h2 className="font-headline-sm text-xl lg:text-2xl font-semibold text-[#e5e9f2]">
              {t('activeSolidarityTitle')}
            </h2>
            <p className="text-xs text-[#9ca7b8]">
              {t('impactExplanationDesc')}
            </p>
          </div>

          <Link
            to="/network"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#242e40] text-[#f2ca50] hover:bg-[#2b3547] text-xs font-bold border border-[#f2ca50]/30 transition shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">handshake</span>
            <span>{t('breadcrumbNetwork')}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        {/* 4 Compteurs d'impact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#151d2a] border border-[#2b3547]/80 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#9ca7b8]">
              <span className="uppercase text-[10px] font-bold tracking-wider">{t('impactNeedsTotal')}</span>
              <span className="material-symbols-outlined text-amber-400 text-[20px]">help_center</span>
            </div>
            <div className="font-headline-lg text-3xl font-bold text-[#e5e9f2] my-1">
              {isLoading ? '...' : needsTotal}
            </div>
            <span className="text-[11px] text-[#9ca7b8]">{t('fraternalRequests')}</span>
          </div>

          <div className="rounded-xl bg-[#151d2a] border border-[#2b3547]/80 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#9ca7b8]">
              <span className="uppercase text-[10px] font-bold tracking-wider">{t('supportInProgress')}</span>
              <span className="material-symbols-outlined text-blue-400 text-[20px]">hourglass_top</span>
            </div>
            <div className="font-headline-lg text-3xl font-bold text-blue-400 my-1">
              {isLoading ? '...' : needsInProgress}
            </div>
            <span className="text-[11px] text-[#9ca7b8]">{t('supportInProgressDesc')}</span>
          </div>

          <div className="rounded-xl bg-[#151d2a] border border-[#2b3547]/80 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#9ca7b8]">
              <span className="uppercase text-[10px] font-bold tracking-wider">{t('connectionMade')}</span>
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">connect_without_contact</span>
            </div>
            <div className="font-headline-lg text-3xl font-bold text-emerald-400 my-1">
              {isLoading ? '...' : relationsActive}
            </div>
            <span className="text-[11px] text-[#9ca7b8]">{t('activeRelationsDesc')}</span>
          </div>

          <div className="rounded-xl bg-[#151d2a] border border-[#2b3547]/80 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-[#9ca7b8]">
              <span className="uppercase text-[10px] font-bold tracking-wider">{t('mutualAidsCompleted')}</span>
              <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">verified</span>
            </div>
            <div className="font-headline-lg text-3xl font-bold text-[#f2ca50] my-1">
              {isLoading ? '...' : needsResolved}
            </div>
            <span className="text-[11px] text-[#9ca7b8]">{t('needsResolvedDesc')}</span>
          </div>
        </div>

        {/* 2 Jauges de performance confraternelle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Jauge 1 : Taux de prise en charge */}
          <div className="rounded-xl bg-[#151d2a]/60 border border-[#2b3547]/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#e5e9f2] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {t('impactSupportRate')}
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {isLoading ? '...' : `${supportRate}%`}
              </span>
            </div>
            <div className="w-full bg-[#1e2736] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, supportRate))}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-[#9ca7b8]">
              {t('supportRateDesc')}
            </p>
          </div>

          {/* Jauge 2 : Taux de résolution */}
          <div className="rounded-xl bg-[#151d2a]/60 border border-[#2b3547]/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#e5e9f2] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f2ca50]"></span>
                {t('impactResolutionRate')}
              </span>
              <span className="font-mono font-bold text-[#f2ca50] text-sm">
                {isLoading ? '...' : `${resolutionRate}%`}
              </span>
            </div>
            <div className="w-full bg-[#1e2736] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#e9c349] to-[#f2ca50] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, resolutionRate))}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-[#9ca7b8]">
              {t('resolutionRateDesc')}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Zone Centrale : Activité Récente & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7">
        
        {/* Table Membres Récents (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <section className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#2b3547]/40 flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-lg font-semibold text-[#e5e9f2] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f2ca50] text-[22px]">badge</span>
                  {t('recentMembersTitle')}
                </h2>
                <p className="text-xs text-[#9ca7b8] mt-0.5">
                  {t('realtimeSyncNeon')}
                </p>
              </div>
              <Link
                to="/members"
                className="text-xs text-[#f2ca50] hover:underline font-semibold flex items-center gap-1"
              >
                <span>{t('viewAllDirectoryLink')}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {/* Vue Desktop : Tableau complet */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left text-xs font-body-md">
                <thead>
                  <tr className="bg-[#111722]/70 text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                    <th className="py-3 px-5">{t('members')} &amp; Matricule</th>
                    <th className="py-3 px-4">{t('situation')}</th>
                    <th className="py-3 px-4">{t('location')}</th>
                    <th className="py-3 px-5 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b3547]/20">
                  {recentMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#9ca7b8]">
                        {isLoading ? t('loading') : t('emptyState')}
                      </td>
                    </tr>
                  ) : (
                    recentMembers.map((member) => (
                      <tr key={member.id} className="group hover:bg-[#1b2332]/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <MemberAvatar
                              photoUrl={member.photo}
                              name={`${member.prenom} ${member.nom}`}
                              matricule={member.matricule}
                              size="sm"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-[#e5e9f2] text-sm group-hover:text-[#f2ca50] transition-colors">
                                  {member.prenom} {member.nom}
                                </span>
                                {member.is_founder && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#f2ca50]/20 text-[#f2ca50] border border-[#f2ca50]/40">
                                    {t('badgeFounder')}
                                  </span>
                                )}
                                {member.is_president && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    {t('badgePresident')}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#9ca7b8] font-mono ltr-tech">{member.matricule}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#e5e9f2]">
                          {member.situation || t('members')}
                        </td>
                        <td className="py-3.5 px-4 text-[#9ca7b8]">
                          {member.ville || 'Sénégal'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to={`/members/${member.matricule || member.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] text-xs font-medium transition"
                          >
                            <span>{t('viewProfile')}</span>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Vue Mobile : Cartes verticales fluides (P0 Responsiveness) */}
            <div className="block md:hidden divide-y divide-[#2b3547]/30">
              {recentMembers.length === 0 ? (
                <div className="py-8 text-center text-[#9ca7b8] text-xs">
                  {isLoading ? t('loading') : t('emptyState')}
                </div>
              ) : (
                recentMembers.map((member) => (
                  <Link
                    key={member.id}
                    to={`/members/${member.matricule || member.id}`}
                    className="flex items-center justify-between p-4 hover:bg-[#1b2332]/60 transition-colors gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar
                        photoUrl={member.photo}
                        name={`${member.prenom} ${member.nom}`}
                        matricule={member.matricule}
                        size="md"
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#e5e9f2] text-sm group-hover:text-[#f2ca50] transition-colors truncate">
                            {member.prenom} {member.nom}
                          </span>
                          {member.is_founder && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f2ca50]/20 text-[#f2ca50] border border-[#f2ca50]/40 shrink-0">
                              {t('badgeFounder')}
                            </span>
                          )}
                          {member.is_president && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                              {t('badgePresident')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#9ca7b8] mt-1">
                          <span className="font-mono ltr-tech text-[#f2ca50] font-semibold">{member.matricule}</span>
                          <span>•</span>
                          <span className="truncate">{member.situation || member.ville || 'Dahirah'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-[#9ca7b8] group-hover:text-[#f2ca50] transition-colors">
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Colonne Latérale : Nos Commissions & Notice de Sécurité (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Nos Commissions Dahirah (Format Institutionnel Chaleureux) */}
          <section className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline-sm text-base font-semibold text-[#e5e9f2] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">account_tree</span>
                  {t('ourCommissionsTitle')}
                </h3>
                <p className="text-[11px] text-[#9ca7b8] mt-0.5">
                  {t('rolesReferenceDesc')}
                </p>
              </div>
              <Link to="/roles" className="text-xs text-[#f2ca50] hover:underline font-bold flex items-center gap-1 shrink-0">
                <span>{t('viewCommissionsLink')}</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="space-y-2.5">
              {topRoles && topRoles.length > 0 ? (
                topRoles.map((r: any, i: number) => (
                  <Link
                    key={i}
                    to="/roles"
                    className="flex items-center justify-between p-3 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 hover:border-[#f2ca50]/40 transition text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] shrink-0"></span>
                      <span className="font-medium text-[#e5e9f2] group-hover:text-[#f2ca50] transition-colors truncate">
                        {r.role__name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] font-bold text-[11px] shrink-0">
                      {r.count}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-xs text-[#9ca7b8]">{t('rolesReferenceDesc')}</p>
              )}
            </div>
          </section>

          {/* Espace Audit & Sécurité (Visible pour Administrateurs & Staff uniquement) */}
          {isStaffOrAdmin && (
            <section className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-headline-sm text-base font-semibold text-[#e5e9f2] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">verified_user</span>
                  {t('securityAuditNotice')}
                </h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
              <p className="text-xs text-[#9ca7b8] mb-4">
                {t('immutableTraceabilityDesc')}
              </p>
              <Link
                to="/audit"
                className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-[#242e40] hover:bg-[#2b3547] text-[#f2ca50] border border-[#f2ca50]/30 text-xs font-bold transition"
              >
                <span className="material-symbols-outlined text-[16px]">shield</span>
                <span>{t('examineAuditEventsBtn')}</span>
              </Link>
            </section>
          )}

        </div>

      </div>

    </div>
  );
};
