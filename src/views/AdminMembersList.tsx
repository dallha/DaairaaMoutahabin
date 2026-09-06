import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  MoreVertical,
  Edit3,
  Trash2,
  CheckCircle2,
  Ban,
  Eye,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Layers,
  RotateCcw,
  SlidersHorizontal,
  SearchX
} from 'lucide-react';
import { Member, Language, CategoryRef, ProfessionRef } from '../types';
import { useTranslation } from '../i18n/translations';

interface AdminMembersListProps {
  members: Member[];
  currentLang: Language;
  onSelectMember: (member: Member) => void;
  onEditMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onAddMember: () => void;
  onNavigate: (view: string) => void;
  categoriesList?: CategoryRef[];
  professionsList?: ProfessionRef[];
}

export const AdminMembersList: React.FC<AdminMembersListProps> = ({
  members,
  currentLang,
  onSelectMember,
  onEditMember,
  onDeleteMember,
  onToggleStatus,
  onAddMember,
  onNavigate,
  categoriesList = [],
  professionsList = [],
}) => {
  const t = useTranslation(currentLang);

  // Multi-criteria filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProfession, setFilterProfession] = useState('ALL');
  const [filterMemberCategory, setFilterMemberCategory] = useState('ALL');
  const [filterAccountStatus, setFilterAccountStatus] = useState('ALL');
  const [filterSector, setFilterSector] = useState('ALL');
  const [filterIssuesOnly, setFilterIssuesOnly] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Compute available professions list with member counts
  const availableProfessions = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const uniquePerMember = new Set<string>(
        m.professions
          .map((p) => p.metier?.trim())
          .filter((name): name is string => Boolean(name && name.length > 0))
      );
      uniquePerMember.forEach((name: string) => {
        map.set(name, (map.get(name) || 0) + 1);
      });
    });

    if (professionsList) {
      professionsList.forEach((pr) => {
        const name = pr.metier?.trim();
        if (name && !map.has(name)) {
          map.set(name, 0);
        }
      });
    }

    return Array.from(map.entries())
      .map(([name, count]): { name: string; count: number } => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [members, professionsList]);

  // Compute member categories (situations) with counts
  const memberCategoryOptions = useMemo(() => {
    const list: { id: string; label: string }[] = [
      { id: 'SALARIE', label: 'Salariés & Cadres' },
      { id: 'ENTREPRENEUR', label: 'Entrepreneurs & Dirigeants' },
      { id: 'INDEPENDANT', label: 'Indépendants & Artisans' },
      { id: 'ETUDIANT', label: 'Étudiants' },
      { id: 'ELEVE', label: 'Élèves' },
      { id: 'SANS_EMPLOI', label: 'En recherche d’emploi' },
      { id: 'RETRAITE', label: 'Retraités' },
      { id: 'AUTRE', label: 'Autres profils' },
    ];
    return list.map((cat) => {
      const count = members.filter((m) => m.situation === cat.id).length;
      return { ...cat, count };
    });
  }, [members]);

  // Compute account statuses with counts
  const accountStatusOptions = useMemo(() => {
    const statuses = [
      { id: 'ACTIF', label: 'Actif' },
      { id: 'EN_ATTENTE', label: 'En attente' },
      { id: 'SUSPENDU', label: 'Suspendu' },
    ];
    return statuses.map((st) => {
      const count = members.filter((m) => m.statutCompte === st.id).length;
      return { ...st, count };
    });
  }, [members]);

  // Compute available professional sectors / categories
  const availableSectors = useMemo(() => {
    const map = new Map<string, number>();
    members.forEach((m) => {
      const uniqueSectors = new Set<string>(
        m.professions
          .map((p) => p.secteur?.trim())
          .filter((s): s is string => Boolean(s && s.length > 0))
      );
      uniqueSectors.forEach((sec: string) => {
        map.set(sec, (map.get(sec) || 0) + 1);
      });
    });
    if (categoriesList) {
      categoriesList.forEach((cat) => {
        const nom = cat.nom?.trim();
        if (nom && !map.has(nom)) {
          map.set(nom, 0);
        }
      });
    }
    return Array.from(map.entries())
      .map(([name, count]): { name: string; count: number } => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [members, categoriesList]);

  // Simultaneous multi-criteria filtering
  const filtered = useMemo(() => {
    return members.filter((m) => {
      // 1. Data quality alert filter
      if (filterIssuesOnly && (!m.dataQualityIssues || m.dataQualityIssues.length === 0)) {
        return false;
      }

      // 2. Profession filter
      if (filterProfession !== 'ALL') {
        const hasProf = m.professions.some(
          (p) => p.metier?.trim().toLowerCase() === filterProfession.trim().toLowerCase()
        );
        if (!hasProf) return false;
      }

      // 3. Member Category filter (Situation)
      if (filterMemberCategory !== 'ALL' && m.situation !== filterMemberCategory) {
        return false;
      }

      // 4. Account Status filter
      if (filterAccountStatus !== 'ALL' && m.statutCompte !== filterAccountStatus) {
        return false;
      }

      // 5. Professional Sector filter
      if (filterSector !== 'ALL') {
        const hasSector = m.professions.some(
          (p) => p.secteur?.trim().toLowerCase() === filterSector.trim().toLowerCase()
        );
        if (!hasSector) return false;
      }

      // 6. Free text search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const base = `${m.prenom} ${m.nom} ${m.matricule} ${m.telephone || ''} ${m.email || ''} ${m.ville} ${m.pays}`.toLowerCase();
        const profs = m.professions.map((p) => `${p.metier} ${p.secteur || ''} ${p.activite || ''}`).join(' ').toLowerCase();
        const fns = m.fonctionsDahirah.map((f) => `${f.role} ${f.pole || ''}`).join(' ').toLowerCase();
        const allText = `${base} ${profs} ${fns}`;
        if (!allText.includes(q)) return false;
      }

      return true;
    });
  }, [
    members,
    searchQuery,
    filterProfession,
    filterMemberCategory,
    filterAccountStatus,
    filterSector,
    filterIssuesOnly,
  ]);

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    filterProfession !== 'ALL' ||
    filterMemberCategory !== 'ALL' ||
    filterAccountStatus !== 'ALL' ||
    filterSector !== 'ALL' ||
    filterIssuesOnly;

  const activeFiltersCount = [
    searchQuery.trim() !== '',
    filterProfession !== 'ALL',
    filterMemberCategory !== 'ALL',
    filterAccountStatus !== 'ALL',
    filterSector !== 'ALL',
    filterIssuesOnly,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterProfession('ALL');
    setFilterMemberCategory('ALL');
    setFilterAccountStatus('ALL');
    setFilterSector('ALL');
    setFilterIssuesOnly(false);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalIssuesCount = members.filter((m) => m.dataQualityIssues && m.dataQualityIssues.length > 0).length;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              {t.navMembersManagement}
            </h1>
            <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full font-semibold">
              {members.length} enregistrés
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Registre officiel des membres, suivi des fiches et vérification de la qualité des données
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onAddMember}
            className="px-3.5 py-2 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.navAddMember}</span>
          </button>

          <button
            onClick={() => onNavigate('import-csv')}
            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium shadow-2xs transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#816C07]" />
            <span>Importer</span>
          </button>

          <button
            onClick={() => onNavigate('export')}
            className="px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-medium shadow-2xs transition flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Multi-Criteria Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {/* Header of Search Bar */}
        <div className="px-4 py-3 bg-stone-50/75 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#335A79]/10 text-[#335A79] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900">
                  Recherche multi-critères
                </span>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-[#335A79] text-white text-[10px] font-bold">
                    {activeFiltersCount} critère{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500">
                Filtrez simultanément par profession, catégorie de membre et statut de compte en temps réel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="text-xs text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
              <span className="font-bold text-[#335A79]">{filtered.length}</span> / {members.length} membres
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="px-2.5 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-medium transition flex items-center gap-1"
                title="Effacer tous les critères"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input & Criteria Grid */}
        <div className="p-4 space-y-3.5">
          {/* Main search text input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Recherche textuelle libre (nom, prénom, matricule, téléphone, email, ville, dahirah...)"
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs text-stone-900 bg-stone-50/40"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 rounded"
                title="Effacer le texte"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Criteria Dropdowns Grid: Profession, Catégorie de membre, Statut de compte, Secteur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 1. Critère Profession */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700">
                <Briefcase className="w-3.5 h-3.5 text-[#335A79]" />
                <span>Profession</span>
              </label>
              <select
                value={filterProfession}
                onChange={(e) => {
                  setFilterProfession(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-2.5 py-2 rounded-xl border text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#335A79] ${
                  filterProfession !== 'ALL'
                    ? 'border-[#335A79] bg-[#335A79]/5 text-[#335A79] font-semibold'
                    : 'border-stone-200 bg-stone-50/60 text-stone-800'
                }`}
              >
                <option value="ALL">Toutes les professions ({members.length})</option>
                {availableProfessions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.count})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Critère Catégorie de membre */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700">
                <Users className="w-3.5 h-3.5 text-[#816C07]" />
                <span>Catégorie de membre</span>
              </label>
              <select
                value={filterMemberCategory}
                onChange={(e) => {
                  setFilterMemberCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-2.5 py-2 rounded-xl border text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#335A79] ${
                  filterMemberCategory !== 'ALL'
                    ? 'border-[#816C07] bg-[#816C07]/5 text-[#816C07] font-semibold'
                    : 'border-stone-200 bg-stone-50/60 text-stone-800'
                }`}
              >
                <option value="ALL">Toutes les catégories ({members.length})</option>
                {memberCategoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Critère Statut de compte */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Statut de compte</span>
              </label>
              <select
                value={filterAccountStatus}
                onChange={(e) => {
                  setFilterAccountStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-2.5 py-2 rounded-xl border text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#335A79] ${
                  filterAccountStatus !== 'ALL'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-900 font-semibold'
                    : 'border-stone-200 bg-stone-50/60 text-stone-800'
                }`}
              >
                <option value="ALL">Tous les statuts ({members.length})</option>
                {accountStatusOptions.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label} ({st.count})
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Critère Secteur / Domaine */}
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700">
                <Layers className="w-3.5 h-3.5 text-stone-500" />
                <span>Secteur d’activité</span>
              </label>
              <select
                value={filterSector}
                onChange={(e) => {
                  setFilterSector(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full px-2.5 py-2 rounded-xl border text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-[#335A79] ${
                  filterSector !== 'ALL'
                    ? 'border-stone-600 bg-stone-100 text-stone-900 font-semibold'
                    : 'border-stone-200 bg-stone-50/60 text-stone-800'
                }`}
              >
                <option value="ALL">Tous les secteurs ({availableSectors.length})</option>
                {availableSectors.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Bottom Bar: Alertes qualité & Badges des critères actifs */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-100 text-xs">
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick toggle for Quality issues */}
              <button
                onClick={() => {
                  setFilterIssuesOnly(!filterIssuesOnly);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                  filterIssuesOnly
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${filterIssuesOnly ? 'text-amber-700' : 'text-stone-400'}`} />
                <span>Fiches avec alertes ({totalIssuesCount})</span>
              </button>

              {/* Active criteria pills */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-stone-400 font-medium mr-0.5">Critères appliqués :</span>
                  
                  {searchQuery.trim() && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-[11px] font-medium border border-stone-200">
                      <span>Recherche : « {searchQuery} »</span>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setCurrentPage(1);
                        }}
                        className="text-stone-400 hover:text-stone-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filterProfession !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#335A79]/10 text-[#335A79] text-[11px] font-semibold border border-[#335A79]/20">
                      <Briefcase className="w-3 h-3" />
                      <span>{filterProfession}</span>
                      <button
                        onClick={() => {
                          setFilterProfession('ALL');
                          setCurrentPage(1);
                        }}
                        className="text-[#335A79] hover:text-[#223c52]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filterMemberCategory !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#816C07]/10 text-[#816C07] text-[11px] font-semibold border border-[#816C07]/20">
                      <Users className="w-3 h-3" />
                      <span>
                        {memberCategoryOptions.find((c) => c.id === filterMemberCategory)?.label || filterMemberCategory}
                      </span>
                      <button
                        onClick={() => {
                          setFilterMemberCategory('ALL');
                          setCurrentPage(1);
                        }}
                        className="text-[#816C07] hover:text-[#5a4c05]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filterAccountStatus !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      <span>
                        Statut : {accountStatusOptions.find((s) => s.id === filterAccountStatus)?.label || filterAccountStatus}
                      </span>
                      <button
                        onClick={() => {
                          setFilterAccountStatus('ALL');
                          setCurrentPage(1);
                        }}
                        className="text-emerald-700 hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filterSector !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-[11px] font-semibold border border-stone-200">
                      <Layers className="w-3 h-3 text-stone-500" />
                      <span>Secteur : {filterSector}</span>
                      <button
                        onClick={() => {
                          setFilterSector('ALL');
                          setCurrentPage(1);
                        }}
                        className="text-stone-400 hover:text-stone-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {filterIssuesOnly && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-[11px] font-semibold border border-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Alertes qualité</span>
                      <button
                        onClick={() => {
                          setFilterIssuesOnly(false);
                          setCurrentPage(1);
                        }}
                        className="text-amber-700 hover:text-amber-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] text-rose-700 hover:text-rose-800 hover:underline font-medium transition flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Effacer tous les filtres</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Mobile Card View (block md:hidden) */}
      <div className="md:hidden space-y-4">
        {paginatedMembers.length === 0 ? (
           <div className="py-8 text-center text-stone-500 text-sm">Aucun membre trouvé</div>
        ) : (
          paginatedMembers.map((m) => {
            const hasIssues = m.dataQualityIssues && m.dataQualityIssues.length > 0;
            return (
              <div key={m.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#335A79] text-white flex items-center justify-center font-bold text-sm">
                      {m.prenom[0]}{m.nom ? m.nom[0] : ''}
                    </div>
                    <div>
                      <p className="font-bold text-stone-900">{m.prenom} {m.nom}</p>
                      <p className="font-mono text-[#816C07] text-xs">{m.matricule}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${
                      m.statutCompte === 'ACTIF'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : m.statutCompte === 'EN_ATTENTE'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {m.statutCompte}
                  </span>
                </div>
                
                <div className="text-xs text-stone-600 grid grid-cols-2 gap-2">
                    <p><span className="font-semibold">Situation:</span> {m.situation.toLowerCase()}</p>
                    <p><span className="font-semibold">Ville:</span> {m.ville}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-stone-100">
                  <button onClick={() => onSelectMember(m)} className="flex-1 h-12 flex items-center justify-center bg-stone-100 text-stone-700 rounded-xl font-medium text-xs">
                     <Eye className="w-5 h-5" />
                  </button>
                  <button onClick={() => onEditMember(m)} className="flex-1 h-12 flex items-center justify-center bg-[#335A79]/10 text-[#335A79] rounded-xl font-medium text-xs">
                     <Edit3 className="w-5 h-5" />
                  </button>
                  <button onClick={() => onToggleStatus(m.id)} className={`flex-1 h-12 flex items-center justify-center rounded-xl font-medium text-xs ${m.statutCompte === 'ACTIF' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                     <Ban className="w-5 h-5" />
                  </button>
                  <button onClick={() => { if(window.confirm('Supprimer ?')) onDeleteMember(m.id); }} className="flex-1 h-12 flex items-center justify-center bg-rose-50 text-rose-700 rounded-xl font-medium text-xs">
                     <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Members Admin Table (hidden md:block) */}
      <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Membre & Matricule</th>
                <th className="py-3.5 px-4">Situation</th>
                <th className="py-3.5 px-4">Professions Déclarées</th>
                <th className="py-3.5 px-4">Fonction Dahirah</th>
                <th className="py-3.5 px-4">Coordonnées</th>
                <th className="py-3.5 px-4">Qualité Données</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 px-4 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center">
                        <SearchX className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-stone-900">
                          Aucun membre ne correspond à vos critères combinés
                        </p>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Aucun enregistrement ne satisfait simultanément la recherche, la profession, la catégorie de membre et le statut de compte sélectionnés.
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button
                          onClick={resetAllFilters}
                          className="mt-2 px-3.5 py-2 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Réinitialiser tous les critères</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  const hasIssues = m.dataQualityIssues && m.dataQualityIssues.length > 0;
                  return (
                  <tr key={m.id} className="hover:bg-stone-50/70 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                    
                    {/* Nom & Matricule */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#335A79] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.prenom[0]}{m.nom ? m.nom[0] : ''}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 hover:text-[#335A79] cursor-pointer" onClick={() => onSelectMember(m)}>
                            {m.prenom} {m.nom || <span className="text-amber-700 italic font-normal">(Nom manquant)</span>}
                          </p>
                          <span className="font-mono text-[#816C07] text-[10px] font-medium">
                            {m.matricule}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Situation */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] capitalize">
                        {m.situation.toLowerCase()}
                      </span>
                    </td>

                    {/* Professions */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {m.professions.map((p, i) => (
                          <span
                            key={p.id || i}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              p.isPrincipale ? 'bg-[#335A79]/10 text-[#335A79]' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {p.metier}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Fonction Dahirah */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {m.fonctionsDahirah.map((fn, i) => (
                          <span
                            key={fn.id || i}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-medium"
                          >
                            {fn.role}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Coordonnées */}
                    <td className="py-3 px-4">
                      <p className="text-[11px] font-mono text-stone-800">
                        {m.telephone || <span className="text-stone-400 italic">Sans tél.</span>}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        {m.ville}
                      </p>
                    </td>

                    {/* Qualité données */}
                    <td className="py-3 px-4">
                      {hasIssues ? (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium" title={m.dataQualityIssues?.join(', ')}>
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{m.dataQualityIssues?.length} alerte(s)</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Conforme</span>
                        </span>
                      )}
                    </td>

                    {/* Statut compte */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          m.statutCompte === 'ACTIF'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.statutCompte === 'EN_ATTENTE'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {m.statutCompte}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectMember(m)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-[#335A79] hover:bg-stone-100 transition"
                          title="Consulter la fiche"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditMember(m)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-[#816C07] hover:bg-stone-100 transition"
                          title="Modifier les informations"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(m.id)}
                          className={`p-1.5 rounded-lg transition ${
                            m.statutCompte === 'ACTIF'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={m.statutCompte === 'ACTIF' ? 'Suspendre' : 'Activer'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Confirmer la suppression du membre ${m.prenom} ${m.nom} ?`)) {
                              onDeleteMember(m.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>


        {/* Table Pagination footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div>
            Affichage de <span className="font-semibold text-stone-800">{paginatedMembers.length}</span> sur <span className="font-semibold text-stone-800">{filtered.length}</span> membres filtrés ({members.length} au total)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>
            <span className="font-medium text-stone-800 px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1"
            >
              <span>Suivant</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
