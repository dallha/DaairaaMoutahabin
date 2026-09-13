import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardStats, getDashboardStats } from '../services/dashboardService';
import { getMembers } from '../services/memberService';
import { Member } from '../types';

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [statsData, membersData] = await Promise.allSettled([
          getDashboardStats(),
          getMembers(5),
        ]);

        if (isMounted) {
          if (statsData.status === 'fulfilled') {
            setStats(statsData.value);
          } else {
            console.warn('Erreur chargement stats Django:', statsData.reason);
            setError('Liaison API Django en cours d’initialisation. Données locales affichées.');
          }

          if (membersData.status === 'fulfilled') {
            setRecentMembers(membersData.value.members || []);
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
  const totalStudents = rawMetrics?.total_students ?? 0;
  const totalProfessionals = rawMetrics?.total_professionals ?? 0;
  const totalJobSeekers = rawMetrics?.total_job_seekers ?? 0;
  const totalArchived = rawMetrics?.total_archived_members ?? 0;
  const topRoles = (stats as any)?.data?.top_roles ?? stats?.top_roles ?? [];
  const recentAuditLogs = (stats as any)?.data?.recent_audit_logs ?? stats?.recent_audit_logs ?? [];

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
                Console de Pilotage Exécutive
              </span>
              <span className="text-xs text-[#9ca7b8] flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-[#f2ca50]">cloud_done</span>
                Connecté Neon DB (PostgreSQL)
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl lg:text-3xl font-medium tracking-tight text-[#e5e9f2]">
              Tableau de Bord &amp; Gouvernance
            </h1>
            <p className="text-xs lg:text-sm text-[#f2ca50]/90 font-headline-sm italic">
              Dāʾiratu Al-Mutahābbīna Fillāhi <span className="text-[#9ca7b8] not-italic font-body-md font-normal">• Shaykh Muhammad Nūruddīn Ibn Shaykh Muhammadul Amīn Nâs</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/members/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 font-bold shadow-[0_4px_20px_rgba(242,202,80,0.35)] hover:brightness-110 active:scale-[0.98] transition text-xs tracking-wide"
            >
              <span className="material-symbols-outlined text-[18px] font-bold">person_add</span>
              <span>+ Enrôler Membre</span>
            </Link>
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

      {/* 2. Bento Grid : 4 Métriques Institutionnelles Dynamiques */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
        
        {/* Metric 1 : Total Membres Actifs */}
        <div className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#f2ca50]/40 transition flex flex-col justify-between group overflow-hidden">
          <div className="absolute -right-3 -top-3 p-3 text-[#f2ca50]/5 group-hover:text-[#f2ca50]/10 transition-colors pointer-events-none">
            <span className="material-symbols-outlined text-[72px]">groups_3</span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">Total Membres Actifs</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] text-[11px] font-semibold border border-[#f2ca50]/20">
                <span className="material-symbols-outlined text-[12px]">verified</span> PostgreSQL
              </span>
            </div>
            <div className="font-headline-lg text-4xl font-semibold tracking-tight text-[#e5e9f2] my-1">
              {isLoading ? '...' : totalMembers}
            </div>
          </div>
          <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
            <span>Enregistrés officiellement</span>
            <span className="text-[#f2ca50] font-semibold">100% Neon DB</span>
          </div>
        </div>

        {/* Metric 2 : Professionnels en Activité */}
        <div className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#f2ca50]/40 transition flex flex-col justify-between group overflow-hidden">
          <div className="absolute -right-3 -top-3 p-3 text-[#f2ca50]/5 group-hover:text-[#f2ca50]/10 transition-colors pointer-events-none">
            <span className="material-symbols-outlined text-[72px]">work</span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">Professionnels</span>
              <span className="px-2 py-0.5 rounded-full bg-[#242e40] text-[#f2ca50] font-bold text-[11px] border border-[#f2ca50]/20">
                Cadres &amp; Métiers
              </span>
            </div>
            <div className="font-headline-lg text-4xl font-semibold tracking-tight text-[#f2ca50] my-1">
              {isLoading ? '...' : totalProfessionals}
            </div>
          </div>
          <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
            <span>Salariés &amp; Indépendants</span>
            <span className="text-[#f2ca50] font-semibold">Actifs</span>
          </div>
        </div>

        {/* Metric 3 : Élèves & Étudiants */}
        <div className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#ffb95f]/40 transition flex flex-col justify-between group overflow-hidden">
          <div className="absolute -right-3 -top-3 p-3 text-[#ffb95f]/5 group-hover:text-[#ffb95f]/10 transition-colors pointer-events-none">
            <span className="material-symbols-outlined text-[72px]">school</span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">Élèves &amp; Étudiants</span>
              <span className="px-2 py-0.5 rounded-full bg-[#ffb95f]/15 text-[#ffb95f] font-bold text-[11px] border border-[#ffb95f]/30">
                Jeunesse &amp; Savoir
              </span>
            </div>
            <div className="font-headline-lg text-4xl font-semibold tracking-tight text-[#ffb95f] my-1">
              {isLoading ? '...' : totalStudents}
            </div>
          </div>
          <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
            <span>Apprenants et Daaras</span>
            <span className="text-[#ffb95f] font-semibold">En formation</span>
          </div>
        </div>

        {/* Metric 4 : En Recherche d'Emploi / Archives */}
        <div className="relative rounded-2xl bg-[#111722]/90 p-5 border border-[#263143] hover:border-[#bfcfed]/40 transition flex flex-col justify-between group overflow-hidden">
          <div className="absolute -right-3 -top-3 p-3 text-[#bfcfed]/5 group-hover:text-[#bfcfed]/10 transition-colors pointer-events-none">
            <span className="material-symbols-outlined text-[72px]">travel_explore</span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider">Pôle Insertion</span>
              <span className="px-2 py-0.5 rounded-full bg-[#242e40] text-[#bfcfed] font-semibold text-[11px]">
                Accompagnement
              </span>
            </div>
            <div className="font-headline-lg text-4xl font-semibold tracking-tight text-[#e5e9f2] my-1">
              {isLoading ? '...' : totalJobSeekers}
            </div>
          </div>
          <div className="pt-3 border-t border-[#2b3547]/30 flex items-center justify-between text-xs text-[#9ca7b8]">
            <span>En recherche active</span>
            <span className="text-[#bfcfed] font-semibold">Priorité Waqf</span>
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
                  Membres Récents Enregistrés
                </h2>
                <p className="text-xs text-[#9ca7b8] mt-0.5">
                  Synchronisé en temps réel avec PostgreSQL Neon
                </p>
              </div>
              <Link
                to="/members"
                className="text-xs text-[#f2ca50] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Voir tout l'annuaire</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs font-body-md">
                <thead>
                  <tr className="bg-[#111722]/70 text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                    <th className="py-3 px-5">Membre &amp; Matricule</th>
                    <th className="py-3 px-4">Situation</th>
                    <th className="py-3 px-4">Pôle / Ville</th>
                    <th className="py-3 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b3547]/20">
                  {recentMembers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#9ca7b8]">
                        {isLoading ? 'Chargement des adhérents...' : 'Aucun membre enregistré.'}
                      </td>
                    </tr>
                  ) : (
                    recentMembers.map((member) => (
                      <tr key={member.id} className="group hover:bg-[#1b2332]/60 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#111722] border border-[#f2ca50]/30 text-[#f2ca50] flex items-center justify-center font-bold text-xs">
                              {member.prenom?.[0] || 'M'}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-[#e5e9f2] text-sm group-hover:text-[#f2ca50] transition-colors">
                                {member.prenom} {member.nom}
                              </span>
                              <span className="text-[11px] text-[#9ca7b8] font-mono">{member.matricule}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#e5e9f2]">
                          {member.situation || 'Membre'}
                        </td>
                        <td className="py-3.5 px-4 text-[#9ca7b8]">
                          {member.ville || 'Sénégal'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            to={`/members/${member.matricule || member.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] text-xs font-medium transition"
                          >
                            <span>Fiche</span>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Colonne Latérale : Top Fonctions & Journal (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Top Fonctions & Commissions Dahirah */}
          <section className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline-sm text-base font-semibold text-[#e5e9f2] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">category</span>
                Commissions Actives
              </h3>
              <Link to="/roles" className="text-[11px] text-[#f2ca50] hover:underline font-bold">
                Gérer
              </Link>
            </div>
            <div className="space-y-2.5">
              {topRoles && topRoles.length > 0 ? (
                topRoles.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#111722] border border-[#2b3547]/40 text-xs">
                    <span className="font-medium text-[#e5e9f2] truncate">{r.role__name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] font-bold text-[11px]">
                      {r.count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#9ca7b8]">Référentiel des rôles et commissions Dahirah.</p>
              )}
            </div>
          </section>

          {/* Journal d'Audit Système */}
          <section className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline-sm text-base font-semibold text-[#e5e9f2] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">security</span>
                Journal d'Audit
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f2ca50] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f2ca50]"></span>
              </span>
            </div>
            <div className="space-y-2.5">
              {recentAuditLogs && recentAuditLogs.length > 0 ? (
                recentAuditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2 text-xs pb-2 border-b border-[#2b3547]/20">
                    <span className="material-symbols-outlined text-[#f2ca50] text-[15px] mt-0.5">history</span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-[#e5e9f2] truncate">{log.action} • {log.entity}</span>
                      <span className="text-[10px] text-[#9ca7b8]">{log.user__email || 'Système'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#9ca7b8]">
                  <p>Traçabilité immuable des mutations administratives et sécurisées.</p>
                </div>
              )}
              <Link
                to="/audit"
                className="block text-center text-xs text-[#f2ca50] hover:underline font-bold pt-1"
              >
                Consulter tous les journaux d'audit
              </Link>
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};
