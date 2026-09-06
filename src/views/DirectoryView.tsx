import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Briefcase,
  Award,
  GraduationCap,
  X,
  ChevronRight,
  User,
  Phone,
  Mail,
  CheckCircle2,
  SlidersHorizontal,
  Download,
  AlertCircle
} from 'lucide-react';
import { Member, CategoryRef, UserRole, Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface DirectoryViewProps {
  members: Member[];
  categories: CategoryRef[];
  currentRole: UserRole;
  currentLang: Language;
  onSelectMember: (member: Member) => void;
  onAddMember?: () => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  members,
  categories,
  currentRole,
  currentLang,
  onSelectMember,
  onAddMember,
}) => {
  const t = useTranslation(currentLang);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSituation, setSelectedSituation] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedFunction, setSelectedFunction] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [showMobileFilterDrawer, setShowMobileFilterDrawer] = useState(false);

  // Extract unique cities & functions from members list
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.ville) set.add(m.ville);
    });
    return Array.from(set).sort();
  }, [members]);

  const uniqueFunctions = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      m.fonctionsDahirah.forEach((fn) => set.add(fn.role));
    });
    return Array.from(set).sort();
  }, [members]);

  // Filtered members calculation
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Search query matches name, professions, matricule, city, formations
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${m.prenom} ${m.nom}`.toLowerCase();
        const matricule = (m.matricule || '').toLowerCase();
        const city = (m.ville || '').toLowerCase();
        const professionsStr = m.professions.map((p) => `${p.metier} ${p.secteur}`).join(' ').toLowerCase();
        const formationsStr = m.formations.map((f) => `${f.domaine} ${f.diplome}`).join(' ').toLowerCase();
        const fonctionsStr = m.fonctionsDahirah.map((f) => f.role).join(' ').toLowerCase();

        const match =
          fullName.includes(q) ||
          matricule.includes(q) ||
          city.includes(q) ||
          professionsStr.includes(q) ||
          formationsStr.includes(q) ||
          fonctionsStr.includes(q);

        if (!match) return false;
      }

      // Filter by Category
      if (selectedCategory !== 'ALL') {
        const inCat = m.professions.some((p) => {
          const matchedCat = categories.find((c) => c.id === selectedCategory || c.nom.toLowerCase() === p.secteur.toLowerCase());
          return (
            p.secteur.toLowerCase().includes(selectedCategory.toLowerCase()) ||
            (matchedCat && p.secteur.toLowerCase().includes(matchedCat.nom.toLowerCase()))
          );
        });
        // Also check if student/élève matched with études
        if (selectedCategory === 'cat-etudes' && (m.situation === 'ETUDIANT' || m.situation === 'ELEVE')) {
          // match
        } else if (!inCat && selectedCategory !== 'cat-etudes') {
          return false;
        }
      }

      // Filter by Situation
      if (selectedSituation !== 'ALL' && m.situation !== selectedSituation) {
        return false;
      }

      // Filter by City
      if (selectedCity !== 'ALL' && m.ville !== selectedCity) {
        return false;
      }

      // Filter by Function in Dahirah
      if (selectedFunction !== 'ALL') {
        const hasFn = m.fonctionsDahirah.some((fn) => fn.role === selectedFunction);
        if (!hasFn) return false;
      }

      return true;
    });
  }, [members, searchQuery, selectedCategory, selectedSituation, selectedCity, selectedFunction, categories]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedSituation('ALL');
    setSelectedCity('ALL');
    setSelectedFunction('ALL');
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'ALL' ||
    selectedSituation !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedFunction !== 'ALL';

  return (
    <div className="space-y-6 pb-16">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              {t.navDirectory}
            </h1>
            <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full font-semibold">
              {filteredMembers.length} {t.membersCount}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Répertoire communautaire des disciples, compétences et talents de la Dahirah
          </p>
        </div>

        {/* View toggler & Mobile filter trigger */}
        <div className="flex items-center gap-2">
          {/* Mobile Filter Drawer trigger button */}
          <button
            onClick={() => setShowMobileFilterDrawer(true)}
            className="lg:hidden px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 shadow-2xs"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#335A79]" />
            <span>Filtres</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#816C07]" />
            )}
          </button>

          {/* Desktop/Tablet Card vs Table toggle */}
          <div className="hidden sm:flex items-center rounded-xl border border-stone-200 bg-white p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === 'CARDS'
                  ? 'bg-[#335A79] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t.cardView}</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                viewMode === 'TABLE'
                  ? 'bg-[#335A79] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t.tableView}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Search & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
        
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            id="directory-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs sm:text-sm text-stone-900 bg-stone-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Desktop Faceted Selects */}
        <div className="hidden lg:grid grid-cols-4 gap-3 text-xs pt-1">
          
          {/* Situation */}
          <div>
            <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Situation
            </label>
            <select
              value={selectedSituation}
              onChange={(e) => setSelectedSituation(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs font-medium"
            >
              <option value="ALL">Toutes les situations</option>
              <option value="ELEVE">Élèves</option>
              <option value="ETUDIANT">Étudiants</option>
              <option value="SALARIE">Salariés & Cadres</option>
              <option value="ENTREPRENEUR">Entrepreneurs</option>
              <option value="INDEPENDANT">Indépendants & Artisans</option>
            </select>
          </div>

          {/* Ville */}
          <div>
            <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Ville / Région
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs font-medium"
            >
              <option value="ALL">Toutes les villes ({uniqueCities.length})</option>
              {uniqueCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Fonction Dahirah */}
          <div>
            <label className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
              Fonction Dahirah
            </label>
            <select
              value={selectedFunction}
              onChange={(e) => setSelectedFunction(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-stone-200 bg-stone-50/70 focus:outline-none focus:ring-2 focus:ring-[#335A79] text-xs font-medium"
            >
              <option value="ALL">Toutes les fonctions</option>
              {uniqueFunctions.map((fn) => (
                <option key={fn} value={fn}>{fn}</option>
              ))}
            </select>
          </div>

          {/* Clear Button */}
          <div className="flex items-end">
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="w-full py-2 px-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 font-medium text-xs transition flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.clearFilters}</span>
              </button>
            ) : (
              <div className="text-[11px] text-stone-400 py-2 italic text-center w-full">
                {filteredMembers.length} résultats
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border ${
            selectedCategory === 'ALL'
              ? 'bg-[#335A79] text-white border-[#335A79] shadow-2xs'
              : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
          }`}
        >
          Tous les secteurs ({members.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'ALL' : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition border flex items-center gap-1.5 ${
              selectedCategory === cat.id
                ? 'bg-[#816C07] text-white border-[#816C07] shadow-2xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span>{cat.nom}</span>
          </button>
        ))}
      </div>

      {/* Main Results Display */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-stone-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-stone-900 text-sm sm:text-base">
            {t.noResults}
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Essayez de modifier votre recherche, de sélectionner un autre secteur ou de réinitialiser vos filtres.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 bg-[#335A79] text-white text-xs font-medium rounded-lg hover:bg-[#223c52] transition inline-block"
          >
            {t.clearFilters}
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        
        /* CARD VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              onClick={() => onSelectMember(member)}
              className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:border-[#335A79]/30 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-4">
                
                {/* Header: Avatar, Name, Matricule */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#335A79]/10 border border-[#335A79]/20 text-[#335A79] flex items-center justify-center font-serif font-bold text-sm shadow-xs group-hover:bg-[#335A79] group-hover:text-white transition">
                      {member.prenom[0]}{member.nom ? member.nom[0] : ''}
                    </div>
                    <div>
                      <h3 className="font-serif italic text-base text-stone-900 group-hover:text-[#335A79] transition leading-tight">
                        {member.prenom} {member.nom || '(Nom manquant)'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                        <span className="font-mono text-[#816C07] font-semibold text-[10px]">
                          {member.matricule}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {member.ville}
                        </span>
                      </div>
                    </div>
                  </div>

                  {member.dataQualityIssues && member.dataQualityIssues.length > 0 && (
                    <span
                      title="Données incomplètes"
                      className="p-1 rounded-full bg-amber-100 text-amber-800"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    </span>
                  )}
                </div>

                {/* Situation badge */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[10px] font-medium text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full capitalize">
                    {member.situation.toLowerCase()}
                  </span>
                </div>

                {/* Professions tags */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                    Profession(s)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.professions.length > 0 ? (
                      member.professions.map((p, idx) => (
                        <span
                          key={p.id || idx}
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                            p.isPrincipale
                              ? 'bg-[#335A79]/10 text-[#335A79] font-semibold'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          <Briefcase className="w-3 h-3 opacity-70" />
                          <span>{p.metier}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-stone-400 italic">
                        {member.situation === 'ELEVE' ? 'En cours de scolarité' : 'Non précisé'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Fonctions Dahirah */}
                {member.fonctionsDahirah.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                      Fonction Dahirah
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {member.fonctionsDahirah.map((fn, idx) => (
                        <span
                          key={fn.id || idx}
                          className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 font-medium inline-flex items-center gap-1"
                        >
                          <Award className="w-2.5 h-2.5 text-[#816C07]" />
                          <span>{fn.role}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom footer button */}
              <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#816C07] group-hover:underline">
                <span>{t.viewDetails}</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
              </div>

            </div>
          ))}
        </div>
      ) : (

        /* TABLE VIEW (DESKTOP) */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Membre & Matricule</th>
                  <th className="py-3 px-4">Situation</th>
                  <th className="py-3 px-4">Professions & Compétences</th>
                  <th className="py-3 px-4">Fonction Dahirah</th>
                  <th className="py-3 px-4">Ville</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => onSelectMember(member)}
                    className="hover:bg-stone-50/80 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-medium text-stone-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#335A79] text-white flex items-center justify-center font-bold text-xs">
                          {member.prenom[0]}{member.nom ? member.nom[0] : ''}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900">
                            {member.prenom} {member.nom || '(Non renseigné)'}
                          </p>
                          <span className="font-mono text-[#816C07] text-[10px]">
                            {member.matricule}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block bg-stone-100 text-stone-700 text-[11px] px-2 py-0.5 rounded capitalize">
                        {member.situation.toLowerCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.professions.map((p, i) => (
                          <span
                            key={p.id || i}
                            className="bg-[#335A79]/10 text-[#335A79] text-[10px] px-1.5 py-0.5 rounded font-medium"
                          >
                            {p.metier}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.fonctionsDahirah.map((fn, i) => (
                          <span
                            key={fn.id || i}
                            className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded font-medium"
                          >
                            {fn.role}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-stone-600">
                      {member.ville}, {member.pays}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-[#335A79] hover:underline font-semibold text-xs">
                        Voir profil →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MOBILE FILTER DRAWER */}
      {showMobileFilterDrawer && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xs bg-white h-full p-6 space-y-6 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#335A79]" />
                <span>Filtres de l’annuaire</span>
              </h3>
              <button
                onClick={() => setShowMobileFilterDrawer(false)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-stone-700 block mb-1">Situation</label>
                <select
                  value={selectedSituation}
                  onChange={(e) => setSelectedSituation(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-300"
                >
                  <option value="ALL">Toutes les situations</option>
                  <option value="ELEVE">Élèves</option>
                  <option value="ETUDIANT">Étudiants</option>
                  <option value="SALARIE">Salariés & Cadres</option>
                  <option value="ENTREPRENEUR">Entrepreneurs</option>
                  <option value="INDEPENDANT">Indépendants & Artisans</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Ville</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-300"
                >
                  <option value="ALL">Toutes les villes</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-700 block mb-1">Fonction Dahirah</label>
                <select
                  value={selectedFunction}
                  onChange={(e) => setSelectedFunction(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-300"
                >
                  <option value="ALL">Toutes les fonctions</option>
                  {uniqueFunctions.map((fn) => (
                    <option key={fn} value={fn}>{fn}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  onClick={() => setShowMobileFilterDrawer(false)}
                  className="w-full py-2.5 bg-[#335A79] text-white rounded-xl font-medium"
                >
                  Appliquer ({filteredMembers.length} membres)
                </button>
                <button
                  onClick={() => {
                    clearAllFilters();
                    setShowMobileFilterDrawer(false);
                  }}
                  className="w-full py-2 text-stone-600 hover:text-stone-900"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
