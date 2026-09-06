import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Clock,
  PhoneCall,
  Mail,
  Briefcase,
  GraduationCap,
  ArrowRight,
  Pencil,
  Search,
  X,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Member } from '../types';

export type IssueUrgency = 'CRITICAL' | 'URGENT' | 'WARNING';
export type IssueCategory = 'INCOMPLETE' | 'OUTDATED' | 'STATUS_PENDING' | 'CONTACT';

export interface MemberIssueSummary {
  member: Member;
  urgency: IssueUrgency;
  primaryReason: string;
  tags: { label: string; icon: string; type: 'contact' | 'profession' | 'formation' | 'status' | 'outdated' | 'quality' }[];
  isOutdated: boolean;
  isIncomplete: boolean;
  isStatusPending: boolean;
  daysSinceInscription: number;
}

interface OutdatedMembersWidgetProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  onEditMember?: (member: Member) => void;
  onNavigateToMembersList: () => void;
}

export const OutdatedMembersWidget: React.FC<OutdatedMembersWidgetProps> = ({
  members,
  onSelectMember,
  onEditMember,
  onNavigateToMembersList,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'CRITICAL' | 'INCOMPLETE' | 'OUTDATED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedView, setExpandedView] = useState(false);

  // Diagnostic algorithm detecting members needing immediate attention or update
  const analyzedMembers = useMemo(() => {
    const today = new Date('2026-09-03'); // Reference current year

    const list: MemberIssueSummary[] = [];

    members.forEach((m) => {
      const tags: MemberIssueSummary['tags'] = [];
      let isOutdated = false;
      let isIncomplete = false;
      let isStatusPending = false;
      let urgency: IssueUrgency = 'WARNING';
      let primaryReason = '';

      // 1. Account status critical check
      if (m.statutCompte === 'EN_ATTENTE') {
        isStatusPending = true;
        tags.push({ label: 'Compte en attente', icon: 'status', type: 'status' });
        urgency = 'CRITICAL';
        primaryReason = 'Adhésion en attente de validation administrative';
      } else if (m.statutCompte === 'SUSPENDU') {
        isStatusPending = true;
        tags.push({ label: 'Compte suspendu', icon: 'status', type: 'status' });
        urgency = 'CRITICAL';
        primaryReason = 'Compte suspendu nécessitant examen';
      }

      // 2. Explicit data quality issues reported
      if (m.dataQualityIssues && m.dataQualityIssues.length > 0) {
        isIncomplete = true;
        m.dataQualityIssues.forEach((issue) => {
          if (issue.toLowerCase().includes('téléphone') || issue.toLowerCase().includes('contact')) {
            tags.push({ label: 'Téléphone manquant', icon: 'phone', type: 'contact' });
            if (urgency !== 'CRITICAL') urgency = 'URGENT';
          } else if (issue.toLowerCase().includes('nom')) {
            tags.push({ label: 'Nom incomplet', icon: 'quality', type: 'quality' });
            urgency = 'CRITICAL';
          } else if (issue.toLowerCase().includes('ambigu') || issue.toLowerCase().includes('profession')) {
            tags.push({ label: 'Métier ambigu', icon: 'profession', type: 'profession' });
            if (urgency !== 'CRITICAL') urgency = 'URGENT';
          } else {
            tags.push({ label: issue, icon: 'quality', type: 'quality' });
            if (urgency !== 'CRITICAL') urgency = 'URGENT';
          }
        });
        if (!primaryReason) {
          primaryReason = m.dataQualityIssues[0];
        }
      }

      // 3. Missing critical contact info
      const hasNoPhone = !m.telephone || m.telephone.trim() === '' || m.telephone.includes('--');
      if (hasNoPhone && !tags.some((t) => t.type === 'contact')) {
        isIncomplete = true;
        tags.push({ label: 'Sans téléphone', icon: 'phone', type: 'contact' });
        if (urgency !== 'CRITICAL') urgency = 'URGENT';
        if (!primaryReason) primaryReason = 'Coordonnées téléphoniques manquantes';
      }

      const hasNoEmail = !m.email || m.email.trim() === '';
      if (hasNoEmail && !tags.some((t) => t.label.includes('email'))) {
        isIncomplete = true;
        tags.push({ label: 'Email absent', icon: 'mail', type: 'contact' });
      }

      // 4. Missing profession
      const hasNoProfession = !m.professions || m.professions.length === 0;
      if (hasNoProfession && !tags.some((t) => t.type === 'profession')) {
        isIncomplete = true;
        tags.push({ label: 'Profession non déclarée', icon: 'briefcase', type: 'profession' });
        if (urgency !== 'CRITICAL') urgency = 'URGENT';
        if (!primaryReason) primaryReason = 'Aucun profil professionnel renseigné';
      }

      // 5. Missing academic cursus for students
      const isStudent = m.situation === 'ETUDIANT' || m.situation === 'ELEVE';
      const hasNoFormation = !m.formations || m.formations.length === 0;
      if (isStudent && hasNoFormation && !tags.some((t) => t.type === 'formation')) {
        isIncomplete = true;
        tags.push({ label: 'Cursus non renseigné', icon: 'formation', type: 'formation' });
        if (!primaryReason) primaryReason = 'Cursus académique ou Daara non spécifié';
      }

      // 6. Outdated information detection:
      // An inscription older than 2.5 years (before 2024) for a student/pupil, or older than 3 years (before 2023) without recent update
      const inscrDate = new Date(m.dateInscription || '2023-01-01');
      const diffMs = today.getTime() - inscrDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const yearsSinceInscription = diffDays / 365.25;

      if (isStudent && yearsSinceInscription >= 2.0) {
        isOutdated = true;
        tags.push({ label: 'Statut étudiant > 2 ans', icon: 'calendar', type: 'outdated' });
        if (!primaryReason) primaryReason = 'Situation étudiante à réactualiser (diplôme ou insertion)';
      } else if (yearsSinceInscription >= 3.5) {
        isOutdated = true;
        tags.push({ label: 'Fiche non actualisée (> 3 ans)', icon: 'calendar', type: 'outdated' });
        if (!primaryReason) primaryReason = 'Réactualisation périodique requise (fiche > 3 ans)';
      }

      // If at least one issue or tag exists, include in attention list
      if (tags.length > 0) {
        // Adjust urgency if 3+ issues
        if (tags.length >= 3 && urgency !== 'CRITICAL') {
          urgency = 'CRITICAL';
        }

        list.push({
          member: m,
          urgency,
          primaryReason: primaryReason || 'Informations du profil à compléter',
          tags,
          isOutdated,
          isIncomplete,
          isStatusPending,
          daysSinceInscription: diffDays,
        });
      }
    });

    // Sort by urgency: CRITICAL first, then URGENT, then WARNING
    const urgencyWeight: Record<IssueUrgency, number> = {
      CRITICAL: 3,
      URGENT: 2,
      WARNING: 1,
    };

    return list.sort((a, b) => {
      const weightDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (weightDiff !== 0) return weightDiff;
      return b.tags.length - a.tags.length;
    });
  }, [members]);

  // Statistics counters
  const totalIssuesCount = analyzedMembers.length;
  const criticalCount = analyzedMembers.filter((item) => item.urgency === 'CRITICAL').length;
  const incompleteCount = analyzedMembers.filter((item) => item.isIncomplete).length;
  const outdatedCount = analyzedMembers.filter((item) => item.isOutdated).length;
  const pendingStatusCount = analyzedMembers.filter((item) => item.isStatusPending).length;

  // Filter based on active tab and search query
  const filteredList = useMemo(() => {
    return analyzedMembers.filter((item) => {
      if (activeTab === 'CRITICAL' && item.urgency !== 'CRITICAL') return false;
      if (activeTab === 'INCOMPLETE' && !item.isIncomplete) return false;
      if (activeTab === 'OUTDATED' && !item.isOutdated) return false;
      if (activeTab === 'PENDING' && !item.isStatusPending) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const m = item.member;
        const text = `${m.prenom} ${m.nom} ${m.matricule} ${m.ville} ${m.telephone || ''} ${item.primaryReason}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [analyzedMembers, activeTab, searchQuery]);

  // Sliced items for display
  const displayLimit = expandedView ? 20 : 5;
  const displayedItems = filteredList.slice(0, displayLimit);

  // Helper for tag icons
  const renderTagIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return <PhoneCall className="w-2.5 h-2.5" />;
      case 'profession':
        return <Briefcase className="w-2.5 h-2.5" />;
      case 'formation':
        return <GraduationCap className="w-2.5 h-2.5" />;
      case 'status':
        return <ShieldAlert className="w-2.5 h-2.5" />;
      case 'outdated':
        return <Calendar className="w-2.5 h-2.5" />;
      default:
        return <AlertTriangle className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
      
      {/* Widget Header */}
      <div className="p-5 bg-stone-50/70 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-serif italic text-[#335A79] font-bold">
                Fiches Nécessitant une Mise à Jour Immédiate
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 text-xs font-bold">
                {totalIssuesCount} fiches à actualiser
              </span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-[11px] font-bold animate-pulse">
                  {criticalCount} critiques
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Profils avec coordonnées manquantes, données académiques obsolètes ou inscriptions en attente d'approbation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={onNavigateToMembersList}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
          >
            <span>Ouvrir dans le Registre</span>
            <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* KPI Micro-Bar: Category Distribution */}
      <div className="px-5 py-3 bg-white border-b border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-2 rounded-xl text-left transition border ${
            activeTab === 'ALL'
              ? 'bg-[#335A79]/5 border-[#335A79]/30 text-[#335A79]'
              : 'border-transparent hover:bg-stone-50 text-stone-600'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-stone-400">Total Prioritaires</div>
          <div className="text-lg font-bold text-stone-900 mt-0.5">{totalIssuesCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('CRITICAL')}
          className={`p-2 rounded-xl text-left transition border ${
            activeTab === 'CRITICAL'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'border-transparent hover:bg-stone-50 text-stone-600'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-rose-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
            Critiques
          </div>
          <div className="text-lg font-bold text-rose-700 mt-0.5">{criticalCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('INCOMPLETE')}
          className={`p-2 rounded-xl text-left transition border ${
            activeTab === 'INCOMPLETE'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'border-transparent hover:bg-stone-50 text-stone-600'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1">
            <PhoneCall className="w-3 h-3" />
            Profils Incomplets
          </div>
          <div className="text-lg font-bold text-amber-800 mt-0.5">{incompleteCount}</div>
        </button>

        <button
          onClick={() => setActiveTab('OUTDATED')}
          className={`p-2 rounded-xl text-left transition border ${
            activeTab === 'OUTDATED'
              ? 'bg-[#816C07]/10 border-[#816C07]/30 text-[#816C07]'
              : 'border-transparent hover:bg-stone-50 text-stone-600'
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-[#816C07] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Données Obsolètes
          </div>
          <div className="text-lg font-bold text-[#816C07] mt-0.5">{outdatedCount}</div>
        </button>
      </div>

      {/* Internal Filter & Quick Search Bar */}
      <div className="px-5 py-3 bg-stone-50/40 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'ALL'
                ? 'bg-[#335A79] text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            Tous ({totalIssuesCount})
          </button>
          <button
            onClick={() => setActiveTab('CRITICAL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            Critiques ({criticalCount})
          </button>
          <button
            onClick={() => setActiveTab('INCOMPLETE')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'INCOMPLETE'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            Incomplets ({incompleteCount})
          </button>
          <button
            onClick={() => setActiveTab('OUTDATED')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'OUTDATED'
                ? 'bg-[#816C07] text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
          >
            Obsolètes ({outdatedCount})
          </button>
          {pendingStatusCount > 0 && (
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'PENDING'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
              }`}
            >
              En attente ({pendingStatusCount})
            </button>
          )}
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer nom, matricule..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#335A79]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Member Items List */}
      <div className="divide-y divide-stone-100">
        {displayedItems.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-stone-900">
              Aucune fiche correspondante dans cette catégorie
            </p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Toutes les fiches répondant aux filtres sélectionnés sont à jour ou régularisées.
            </p>
          </div>
        ) : (
          displayedItems.map((item) => {
            const m = item.member;
            const isCritical = item.urgency === 'CRITICAL';
            const isUrgent = item.urgency === 'URGENT';
            const initials = `${m.prenom[0] || ''}${m.nom[0] || ''}`;

            return (
              <div
                key={m.id}
                className="p-4 sm:px-5 hover:bg-stone-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left: Member Identity & Urgency Badge */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Avatar */}
                  <div
                    onClick={() => onSelectMember(m)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer transition shadow-2xs ${
                      isCritical
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : isUrgent
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        : 'bg-[#335A79]/10 text-[#335A79] border border-[#335A79]/20 hover:bg-[#335A79]/20'
                    }`}
                  >
                    {initials || 'DM'}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => onSelectMember(m)}
                        className="font-bold text-sm text-stone-900 hover:text-[#335A79] cursor-pointer truncate"
                      >
                        {m.prenom} {m.nom}
                      </span>
                      <span className="text-[10px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200 shrink-0">
                        {m.matricule}
                      </span>

                      {/* Urgency Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : isUrgent
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {isCritical ? '🚨 Critique' : isUrgent ? '⚠️ Urgent' : 'ℹ️ À vérifier'}
                      </span>
                    </div>

                    {/* Primary Diagnostic Reason */}
                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                      {item.primaryReason}
                    </p>

                    {/* Metadata & Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[11px] text-stone-600 mr-1">
                        {m.ville || 'Dakar'} • {m.situation}
                      </span>

                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            tag.type === 'status'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : tag.type === 'contact'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : tag.type === 'outdated'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-stone-100 text-stone-700 border border-stone-200'
                          }`}
                        >
                          {renderTagIcon(tag.type)}
                          <span>{tag.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Direct Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                  {onEditMember && (
                    <button
                      onClick={() => onEditMember(m)}
                      className="px-3 py-1.5 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
                      title="Ouvrir l’éditeur pour compléter cette fiche"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Mettre à jour</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectMember(m)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium transition flex items-center gap-1"
                    title="Consulter le profil complet"
                  >
                    <span>Consulter</span>
                    <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Widget Footer: Pagination / Toggle Expand */}
      <div className="p-4 bg-stone-50/70 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <span>
            Affichage de <strong>{displayedItems.length}</strong> sur <strong>{filteredList.length}</strong> fiches prioritaires
          </span>
          {filteredList.length > 5 && (
            <button
              onClick={() => setExpandedView(!expandedView)}
              className="font-semibold text-[#335A79] hover:underline ml-1"
            >
              {expandedView ? 'Réduire la liste (5 fiches)' : `Afficher plus (${filteredList.length - 5} fiches supplémentaires)`}
            </button>
          )}
        </div>

        <button
          onClick={onNavigateToMembersList}
          className="font-semibold text-[#816C07] hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Consulter le registre complet des alertes</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
