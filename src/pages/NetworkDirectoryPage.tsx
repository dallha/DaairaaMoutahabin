import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  searchNetwork,
  getSkillCategories,
  getSkills,
  NetworkMemberCard,
  SkillCategory,
  Skill,
} from '../services/networkService';

export const NetworkDirectoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [members, setMembers] = useState<NetworkMemberCard[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Référentiels pour filtres
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skillsList, setSkillsList] = useState<Skill[]>([]);

  // Filtres actifs depuis URL
  const searchTerm = searchParams.get('search') || '';
  const filterSector = searchParams.get('sector') || '';
  const filterSkill = searchParams.get('skill') || '';
  const filterServiceType = searchParams.get('service_type') || '';
  const filterCity = searchParams.get('city') || '';
  const filterMentoring = searchParams.get('mentoring') === 'true';
  const filterProHelp = searchParams.get('pro_help') === 'true';

  // Chargement des référentiels au montage
  useEffect(() => {
    async function loadRefs() {
      const [cats, sks] = await Promise.all([
        getSkillCategories(),
        getSkills(),
      ]);
      setCategories(cats);
      setSkillsList(sks);
    }
    loadRefs();
  }, []);

  // Recherche des membres
  useEffect(() => {
    let isMounted = true;
    async function fetchNetwork() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await searchNetwork({
          search: searchTerm || undefined,
          sector: filterSector || undefined,
          skill: filterSkill || undefined,
          service_type: filterServiceType || undefined,
          city: filterCity || undefined,
          mentoring: filterMentoring || undefined,
          pro_help: filterProHelp || undefined,
        });

        if (isMounted) {
          setMembers(response.results || []);
          setTotalCount(response.count || 0);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur lors de la recherche dans le réseau.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchNetwork();
    return () => {
      isMounted = false;
    };
  }, [searchTerm, filterSector, filterSkill, filterServiceType, filterCity, filterMentoring, filterProHelp]);

  const updateFilter = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (value) {
      p.set(key, value);
    } else {
      p.delete(key);
    }
    setSearchParams(p);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Boolean(
    searchTerm || filterSector || filterSkill || filterServiceType || filterCity || filterMentoring || filterProHelp
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      
      {/* En-tête de section Carrefour */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#151c28]/95 border border-[#2b3547]/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/70 to-transparent"></div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-[11px] font-bold">
              Chantier V1.1 • Réseau &amp; Synergie
            </span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-semibold text-[#e5e9f2] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#f2ca50] text-[32px]">hub</span>
            Carrefour Professionnel &amp; Entraide
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1.5 max-w-2xl">
            Mettez en relation les talents, compétences et expertises des disciples de la Dahirah.
            Sollicitez du mentorat, des prestations confraternelles et des conseils professionnels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/members"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#242e40] text-[#e5e9f2] hover:bg-[#2e3b52] hover:text-[#f2ca50] text-xs font-semibold border border-[#2b3547] transition"
          >
            <span className="material-symbols-outlined text-[17px]">groups</span>
            <span>Annuaire Administratif</span>
          </Link>
        </div>
      </div>

      {/* Barre de Recherche & Filtres Multi-Facettes */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-[#111722] border border-[#2b3547]/80 shadow-lg">
        
        {/* Ligne 1 : Champ de Recherche Globale */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#f2ca50] text-[20px]">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => updateFilter('search', e.target.value || null)}
            placeholder="Rechercher par compétence (ex: React, Droit), métier, organisation, disciple..."
            className="w-full bg-[#06090e] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl pl-11 pr-4 py-3 outline-none border border-[#2b3547] focus:border-[#f2ca50] transition"
          />
        </div>

        {/* Ligne 2 : Sélecteurs en cascade combinables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          
          {/* Filtre Secteur */}
          <div>
            <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Secteur d'Activité</label>
            <select
              value={filterSector}
              onChange={(e) => updateFilter('sector', e.target.value || null)}
              className="w-full bg-[#090d14] text-[#e5e9f2] text-xs rounded-xl p-2.5 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
            >
              <option value="">Tous les secteurs</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre Compétence */}
          <div>
            <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Compétence Spécifique</label>
            <select
              value={filterSkill}
              onChange={(e) => updateFilter('skill', e.target.value || null)}
              className="w-full bg-[#090d14] text-[#e5e9f2] text-xs rounded-xl p-2.5 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
            >
              <option value="">Toutes compétences</option>
              {skillsList.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre Modalité d'Entraide */}
          <div>
            <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Type d'Entraide</label>
            <select
              value={filterServiceType}
              onChange={(e) => updateFilter('service_type', e.target.value || null)}
              className="w-full bg-[#090d14] text-[#e5e9f2] text-xs rounded-xl p-2.5 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
            >
              <option value="">Tous types d'entraide</option>
              <option value="VOLUNTEER">Bénévolat &amp; Entraide pure</option>
              <option value="DAHIRAH_RATE">Prestation Tarif Dahirah</option>
              <option value="MENTORSHIP">Mentorat &amp; Partage</option>
              <option value="STANDARD">Prestation Standard</option>
            </select>
          </div>

          {/* Filtre Ville */}
          <div>
            <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Localisation / Ville</label>
            <input
              type="text"
              value={filterCity}
              onChange={(e) => updateFilter('city', e.target.value || null)}
              placeholder="Ex: Dakar, Thiès, Kaolack..."
              className="w-full bg-[#090d14] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl p-2.5 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
            />
          </div>

        </div>

        {/* Ligne 3 : Toggles Rapides Disponibilité */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#2b3547]/40 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => updateFilter('mentoring', filterMentoring ? null : 'true')}
              className={`px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                filterMentoring
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                  : 'bg-[#090d14] border-[#2b3547] text-[#9ca7b8] hover:text-[#e5e9f2]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">school</span>
              <span>Ouvert au Mentorat</span>
            </button>

            <button
              onClick={() => updateFilter('pro_help', filterProHelp ? null : 'true')}
              className={`px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${
                filterProHelp
                  ? 'bg-[#f2ca50]/20 border-[#f2ca50]/40 text-[#f2ca50] font-bold'
                  : 'bg-[#090d14] border-[#2b3547] text-[#9ca7b8] hover:text-[#e5e9f2]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">lightbulb</span>
              <span>Disponible Conseil Pro</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[#9ca7b8]">
              <strong className="text-[#f2ca50]">{totalCount}</strong> membres recensés • <strong className="text-emerald-400">{members.filter(m => (m.skills && m.skills.length > 0) || m.services_count > 0).length}</strong> profil{members.filter(m => (m.skills && m.skills.length > 0) || m.services_count > 0).length > 1 ? 's' : ''} enrichi{members.filter(m => (m.skills && m.skills.length > 0) || m.services_count > 0).length > 1 ? 's' : ''}
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                <span>Effacer tous les filtres</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Message d'erreur éventuel */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Grille des Cartes Réseau Membres */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#f2ca50] gap-3">
          <span className="material-symbols-outlined text-[42px] animate-spin">sync</span>
          <span className="text-xs text-[#9ca7b8] font-medium tracking-wide">Recherche dans le réseau de la Dahirah...</span>
        </div>
      ) : members.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#151c28]/80 border border-[#2b3547]/60 text-center flex flex-col items-center gap-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#111722] border border-[#f2ca50]/30 text-[#f2ca50] flex items-center justify-center">
            <span className="material-symbols-outlined text-[36px]">travel_explore</span>
          </div>
          <h3 className="font-headline-sm text-lg font-bold text-[#e5e9f2]">Aucun Disciple ne Correspond</h3>
          <p className="text-xs text-[#9ca7b8]">
            Aucun membre ne correspond à cette combinaison de compétences, secteur ou localisation.
            Essayez d'élargir vos critères de recherche.
          </p>
          <button
            onClick={clearAllFilters}
            className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 text-xs font-bold hover:brightness-110 transition"
          >
            Voir tous les disciples
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((m) => (
            <div
              key={m.id}
              className="rounded-2xl bg-[#151c28]/95 border border-[#2b3547]/70 hover:border-[#f2ca50]/50 p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-xl group hover:-translate-y-0.5"
            >
              {/* En-tête de la Carte */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#111722] to-[#242e40] border border-[#f2ca50]/40 flex items-center justify-center text-[#f2ca50] font-headline-lg font-bold text-lg shadow-md">
                      {m.first_name?.[0] || 'M'}
                    </div>
                    <div>
                      <Link
                        to={`/members/${m.matricule || m.id}`}
                        className="font-bold text-sm text-[#e5e9f2] group-hover:text-[#f2ca50] transition-colors line-clamp-1"
                      >
                        {m.display_name}
                      </Link>
                      <span className="text-[11px] text-[#9ca7b8] font-mono">{m.matricule}</span>
                    </div>
                  </div>

                  {m.open_for_mentoring && (
                    <span className="p-1 rounded-md bg-emerald-500/15 text-emerald-400" title="Ouvert au mentorat">
                      <span className="material-symbols-outlined text-[18px]">school</span>
                    </span>
                  )}
                </div>

                {/* Métier & Organisation */}
                <div className="space-y-1 mb-3 text-xs">
                  <div className="flex items-center gap-1.5 text-[#e5e9f2] font-semibold">
                    <span className="material-symbols-outlined text-[15px] text-[#f2ca50]">work</span>
                    <span className="line-clamp-1">{m.primary_profession || 'Adhérent actif'}</span>
                  </div>
                  {m.primary_organization && (
                    <div className="flex items-center gap-1.5 text-[#9ca7b8] text-[11px]">
                      <span className="material-symbols-outlined text-[14px]">apartment</span>
                      <span className="line-clamp-1">{m.primary_organization}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[#9ca7b8] text-[11px]">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span>{m.city || 'Dakar'}</span>
                  </div>
                </div>

                {/* Tags de Compétences */}
                <div className="pt-2.5 border-t border-[#2b3547]/40">
                  <span className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1.5">
                    Compétences &amp; Savoir-Faire :
                  </span>
                  {m.skills && m.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {m.skills.map((sk) => (
                        <span
                          key={sk.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#111722] border border-[#2b3547] text-[11px] text-[#e5e9f2]"
                        >
                          <span>{sk.name}</span>
                          {sk.is_verified && (
                            <span className="material-symbols-outlined text-emerald-400 text-[13px]" title="Vérifié">
                              verified
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111722] border border-amber-500/20 text-amber-300/80 text-[10px] font-medium">
                      <span className="material-symbols-outlined text-[13px] text-amber-400">pending</span>
                      <span>Profil communautaire en cours d’enrichissement</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Pied de Carte & Action 360° */}
              <div className="pt-3 border-t border-[#2b3547]/40 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[11px] text-[#9ca7b8]">
                  {m.services_count > 0 ? (
                    <span className="text-[#f2ca50] font-semibold">{m.services_count} service(s) offert(s)</span>
                  ) : (
                    <span>Profil communautaire</span>
                  )}
                </div>

                <Link
                  to={`/members/${m.matricule || m.id}`}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-xs font-bold text-[#e5e9f2] transition"
                >
                  <span>Fiche 360°</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};
