import React, { useState, useMemo } from 'react';
import {
  MapPin,
  BarChart3,
  Flame,
  Globe,
  Building2,
  Users,
  ArrowRight,
  TrendingUp,
  Layers,
  Info,
  ChevronRight,
  Sparkles,
  Search,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Member } from '../types';

interface GeographicDistributionWidgetProps {
  members: Member[];
  onSelectMember: (member: Member) => void;
  onNavigateToMembersList: () => void;
}

export type ViewMode = 'BARS' | 'HEATMAP' | 'GRID';

export interface CityStat {
  ville: string;
  pays: string;
  count: number;
  percentage: number;
  menCount: number;
  womenCount: number;
  salariedCount: number;
  studentsCount: number;
  entrepreneursCount: number;
  activeCount: number;
  members: Member[];
  coordinates?: { x: number; y: number }; // For SVG Map
  intensityLevel: 1 | 2 | 3 | 4; // 1: low, 2: medium, 3: high, 4: very high
}

// Known geographic positions projected on a 600x420 SVG map of Senegal
const KNOWN_COORDINATES: Record<string, { x: number; y: number }> = {
  'dakar': { x: 70, y: 195 },
  'thiès': { x: 120, y: 190 },
  'thies': { x: 120, y: 190 },
  'mbour': { x: 125, y: 222 },
  'kaolack': { x: 195, y: 245 },
  'kaffrine': { x: 255, y: 242 },
  'saint-louis': { x: 155, y: 85 },
  'saint louis': { x: 155, y: 85 },
  'louga': { x: 155, y: 140 },
  'diourbel': { x: 160, y: 195 },
  'touba': { x: 195, y: 180 },
  'fatick': { x: 160, y: 235 },
  'ziguinchor': { x: 135, y: 355 },
  'kolda': { x: 230, y: 350 },
  'sédhiou': { x: 180, y: 355 },
  'sedhiou': { x: 180, y: 355 },
  'tambacounda': { x: 380, y: 260 },
  'kédougou': { x: 450, y: 350 },
  'kedougou': { x: 450, y: 350 },
  'matam': { x: 340, y: 130 },
  'podor': { x: 240, y: 80 },
  'richard-toll': { x: 185, y: 80 },
  'tivaouane': { x: 125, y: 175 },
};

export const GeographicDistributionWidget: React.FC<GeographicDistributionWidgetProps> = ({
  members,
  onSelectMember,
  onNavigateToMembersList,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('BARS');
  const [sortBy, setSortBy] = useState<'COUNT' | 'NAME'>('COUNT');
  const [selectedCity, setSelectedCity] = useState<CityStat | null>(null);
  const [hoveredCity, setHoveredCity] = useState<CityStat | null>(null);

  // Compute distribution
  const cityStats = useMemo(() => {
    const total = members.length || 1;
    const map = new Map<string, CityStat>();

    members.forEach((m) => {
      const cityKey = (m.ville || 'Non précisé').trim();
      const countryKey = (m.pays || 'Sénégal').trim();

      if (!map.has(cityKey)) {
        const normalized = cityKey.toLowerCase();
        const coords = KNOWN_COORDINATES[normalized] || { x: 300, y: 200 };

        map.set(cityKey, {
          ville: cityKey,
          pays: countryKey,
          count: 0,
          percentage: 0,
          menCount: 0,
          womenCount: 0,
          salariedCount: 0,
          studentsCount: 0,
          entrepreneursCount: 0,
          activeCount: 0,
          members: [],
          coordinates: coords,
          intensityLevel: 1,
        });
      }

      const stat = map.get(cityKey)!;
      stat.count += 1;
      stat.members.push(m);
      if (m.sexe === 'M') stat.menCount += 1;
      if (m.sexe === 'F') stat.womenCount += 1;
      if (m.situation === 'SALARIE') stat.salariedCount += 1;
      if (m.situation === 'ETUDIANT' || m.situation === 'ELEVE') stat.studentsCount += 1;
      if (m.situation === 'ENTREPRENEUR' || m.situation === 'INDEPENDANT') stat.entrepreneursCount += 1;
      if (m.statutCompte === 'ACTIF') stat.activeCount += 1;
    });

    const list = Array.from(map.values()).map((stat) => {
      stat.percentage = Math.round((stat.count / total) * 100);

      // Intensity level based on member volume
      if (stat.count >= 15) {
        stat.intensityLevel = 4;
      } else if (stat.count >= 6) {
        stat.intensityLevel = 3;
      } else if (stat.count >= 3) {
        stat.intensityLevel = 2;
      } else {
        stat.intensityLevel = 1;
      }

      return stat;
    });

    if (sortBy === 'COUNT') {
      return list.sort((a, b) => b.count - a.count || a.ville.localeCompare(b.ville, 'fr'));
    } else {
      return list.sort((a, b) => a.ville.localeCompare(b.ville, 'fr'));
    }
  }, [members, sortBy]);

  const totalCities = cityStats.length;
  const topCity = cityStats[0];
  const totalCount = members.length;

  // Heat map intensity helpers
  const getIntensityColor = (level: number) => {
    switch (level) {
      case 4:
        return {
          badge: 'bg-rose-500 text-white',
          glow: 'rgba(244, 63, 94, 0.45)',
          pulse: 'bg-rose-500',
          border: 'border-rose-300',
          card: 'bg-gradient-to-br from-rose-50 to-orange-50/60 border-rose-200',
          barGradient: 'from-rose-500 via-amber-500 to-[#816C07]',
          text: 'text-rose-700',
        };
      case 3:
        return {
          badge: 'bg-amber-600 text-white',
          glow: 'rgba(217, 119, 6, 0.4)',
          pulse: 'bg-amber-500',
          border: 'border-amber-300',
          card: 'bg-gradient-to-br from-amber-50/80 to-stone-50 border-amber-200',
          barGradient: 'from-amber-600 to-[#816C07]',
          text: 'text-amber-800',
        };
      case 2:
        return {
          badge: 'bg-[#335A79] text-white',
          glow: 'rgba(51, 90, 121, 0.35)',
          pulse: 'bg-[#335A79]',
          border: 'border-[#335A79]/30',
          card: 'bg-gradient-to-br from-sky-50/70 to-stone-50 border-sky-200',
          barGradient: 'from-[#335A79] to-sky-600',
          text: 'text-[#335A79]',
        };
      default:
        return {
          badge: 'bg-stone-600 text-white',
          glow: 'rgba(100, 116, 139, 0.25)',
          pulse: 'bg-stone-400',
          border: 'border-stone-200',
          card: 'bg-white border-stone-200',
          barGradient: 'from-stone-500 to-stone-400',
          text: 'text-stone-700',
        };
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
      
      {/* Widget Header & Switcher */}
      <div className="p-5 bg-stone-50/70 border-b border-stone-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#335A79]/10 border border-[#335A79]/20 text-[#335A79] flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-5 h-5 text-[#335A79]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-serif italic text-[#335A79] font-bold">
                Répartition Géographique par Localité & Ville
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#335A79]/10 text-[#335A79] border border-[#335A79]/20 text-xs font-bold">
                {totalCities} localités répertoriées
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Cartographie de l’ancrage territorial des disciples au Sénégal et dans les diasporas de la Dahirah.
            </p>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-2xl self-start md:self-center shrink-0">
          <button
            onClick={() => setViewMode('BARS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === 'BARS'
                ? 'bg-white text-[#335A79] shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Graphique</span> Barres
          </button>

          <button
            onClick={() => setViewMode('HEATMAP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === 'HEATMAP'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Carte Thermique</span>
          </button>

          <button
            onClick={() => setViewMode('GRID')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              viewMode === 'GRID'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Matrice</span>
          </button>
        </div>
      </div>

      {/* KPI Micro Summary Bar */}
      <div className="px-5 py-3 bg-white border-b border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2 rounded-xl bg-stone-50 border border-stone-100">
          <div className="text-[10px] uppercase font-bold text-stone-400">Total Villes</div>
          <div className="text-lg font-bold text-stone-900 mt-0.5">{totalCities} pôles</div>
        </div>

        <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100">
          <div className="text-[10px] uppercase font-bold text-rose-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
            Premier Pôle ({topCity?.ville || '-'})
          </div>
          <div className="text-lg font-bold text-rose-800 mt-0.5">
            {topCity ? `${topCity.count} membres (${topCity.percentage}%)` : '-'}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-100">
          <div className="text-[10px] uppercase font-bold text-amber-700">Foyer Historique</div>
          <div className="text-lg font-bold text-amber-900 mt-0.5">
            {cityStats.find((c) => c.ville.toLowerCase() === 'kaolack')?.count || 0} membres (Kaolack)
          </div>
        </div>

        <div className="p-2 rounded-xl bg-[#335A79]/5 border border-[#335A79]/15">
          <div className="text-[10px] uppercase font-bold text-[#335A79]">Régions & Diaspora</div>
          <div className="text-lg font-bold text-[#335A79] mt-0.5">
            {cityStats.length > 2 ? `${cityStats.length - 2} autres localités` : 'Couverture nationale'}
          </div>
        </div>
      </div>

      {/* Main Content Area: Tab Views */}
      <div className="p-5">

        {/* VIEW 1: HORIZONTAL BAR CHART */}
        {viewMode === 'BARS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-100 text-xs">
              <span className="text-stone-500">
                Classement par concentration d’effectif au sein de la Dahirah :
              </span>
              <div className="flex items-center gap-2">
                <span className="text-stone-400 text-[11px]">Trier par :</span>
                <button
                  onClick={() => setSortBy('COUNT')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    sortBy === 'COUNT' ? 'bg-[#335A79] text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Effectif
                </button>
                <button
                  onClick={() => setSortBy('NAME')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    sortBy === 'NAME' ? 'bg-[#335A79] text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  Alphabétique
                </button>
              </div>
            </div>

            <div className="space-y-3.5">
              {cityStats.map((stat, idx) => {
                const styling = getIntensityColor(stat.intensityLevel);
                const isTop = idx === 0;

                return (
                  <div
                    key={stat.ville}
                    onClick={() => setSelectedCity(selectedCity?.ville === stat.ville ? null : stat)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      selectedCity?.ville === stat.ville
                        ? 'border-[#335A79] bg-stone-50/90 ring-2 ring-[#335A79]/20'
                        : 'border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                    }`}
                  >
                    {/* City Top Line: Name, Count, Percentage */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm text-stone-900">
                          {stat.ville}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          ({stat.pays})
                        </span>
                        {isTop && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                            Principal Pôle
                          </span>
                        )}
                        {stat.ville.toLowerCase() === 'kaolack' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                            Foyer Médina Baye
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-stone-900">
                          {stat.count} {stat.count > 1 ? 'membres' : 'membre'}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                          {stat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* The Horizontal Bar */}
                    <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden p-0.5 relative">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${styling.barGradient} transition-all duration-700 ease-out shadow-xs`}
                        style={{ width: `${Math.max(stat.percentage, 4)}%` }}
                      />
                    </div>

                    {/* Sub-metrics Pills */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span>
                          <strong>{stat.menCount}</strong> Hommes • <strong>{stat.womenCount}</strong> Femmes
                        </span>
                        <span className="text-stone-300">•</span>
                        <span>
                          <strong>{stat.salariedCount + stat.entrepreneursCount}</strong> Professionnels • <strong>{stat.studentsCount}</strong> Étudiants
                        </span>
                      </div>

                      <span className="text-[#335A79] hover:underline font-semibold flex items-center gap-1">
                        {selectedCity?.ville === stat.ville ? 'Masquer détails' : 'Voir les disciples'}
                        <ChevronRight className={`w-3 h-3 transition-transform ${selectedCity?.ville === stat.ville ? 'rotate-90' : ''}`} />
                      </span>
                    </div>

                    {/* Drill-down members drawer if clicked */}
                    {selectedCity?.ville === stat.ville && (
                      <div className="mt-3 pt-3 border-t border-stone-200/80 space-y-2">
                        <div className="text-[11px] font-bold text-stone-700">
                          Disciples recensés à {stat.ville} ({stat.members.length}) :
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {stat.members.map((m) => (
                            <div
                              key={m.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectMember(m);
                              }}
                              className="p-2 bg-white rounded-xl border border-stone-200 hover:border-[#335A79] hover:shadow-2xs transition flex items-center justify-between gap-2 group cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-stone-900 group-hover:text-[#335A79] truncate">
                                  {m.prenom} {m.nom}
                                </p>
                                <p className="text-[10px] text-stone-500 truncate">
                                  {m.matricule} • {m.situation}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#335A79] shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: CARTOGRAPHIC HEAT MAP */}
        {viewMode === 'HEATMAP' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-stone-600 bg-amber-50/60 border border-amber-200/70 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Projection thermique territoriale :</strong> L'intensité thermique et la circonférence des points chauds reflètent la densité des membres par localité.
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] shrink-0">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Forte ({'>'}15)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Moyenne (5-15)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#335A79] inline-block" /> Émergente (1-4)
                </span>
              </div>
            </div>

            {/* SVG MAP OF SENEGAL WITH THERMAL RADIUS HUBS */}
            <div className="relative w-full bg-gradient-to-b from-[#F9F9F8] to-[#F1F3F5] rounded-3xl border border-stone-200/80 p-4 overflow-hidden flex flex-col items-center">
              
              {/* Compass Decoration */}
              <div className="absolute top-4 right-4 text-stone-300 text-[10px] font-mono flex flex-col items-center select-none pointer-events-none">
                <span className="font-bold text-stone-400">N</span>
                <span>↑</span>
              </div>

              {/* Interactive SVG */}
              <svg
                viewBox="0 0 540 380"
                className="w-full max-w-2xl h-auto drop-shadow-sm select-none"
                style={{ maxHeight: '420px' }}
              >
                <defs>
                  {/* Radial Heat Gradient for Dakar (High) */}
                  <radialGradient id="heatHigh" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.85" />
                    <stop offset="40%" stopColor="#FB923C" stopOpacity="0.55" />
                    <stop offset="80%" stopColor="#FBBF24" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>

                  {/* Radial Heat Gradient for Kaolack (Medium High) */}
                  <radialGradient id="heatMed" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#D97706" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>

                  {/* Radial Heat Gradient for Emerging cities */}
                  <radialGradient id="heatLow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#335A79" stopOpacity="0.75" />
                    <stop offset="50%" stopColor="#0284C7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Stylized Senegal Outline Shape */}
                <path
                  d="M 155 70
                     C 180 65, 230 75, 260 85
                     C 300 100, 360 120, 390 145
                     C 420 170, 460 210, 480 250
                     C 490 280, 485 320, 470 345
                     C 440 360, 400 355, 370 340
                     C 350 330, 330 335, 300 345
                     C 260 360, 210 365, 170 360
                     C 140 355, 110 350, 100 340
                     C 90 320, 105 300, 125 295
                     C 145 290, 170 290, 185 275
                     C 195 260, 180 240, 160 235
                     C 130 230, 105 230, 85 220
                     C 65 210, 50 200, 55 190
                     C 60 175, 80 170, 105 165
                     C 125 155, 145 130, 150 100
                     Z"
                  fill="#EAECEE"
                  stroke="#CBD5E1"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />

                {/* Gambia Enclave Stylized Inset */}
                <path
                  d="M 105 275
                     C 140 270, 180 268, 230 270
                     C 250 271, 270 272, 280 275
                     C 275 285, 250 288, 220 286
                     C 170 284, 135 288, 105 290
                     Z"
                  fill="#DFE4EA"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
                <text x="180" y="282" fill="#94A3B8" fontSize="8" fontStyle="italic" textAnchor="middle">
                  Gambie
                </text>

                {/* Ocean Label */}
                <text x="35" y="120" fill="#94A3B8" fontSize="10" fontStyle="italic" opacity="0.6">
                  Océan Atlantique
                </text>

                {/* River Flows Decorative */}
                <path
                  d="M 155 70 C 200 70, 250 85, 310 115 C 370 145, 410 170, 440 220"
                  fill="none"
                  stroke="#93C5FD"
                  strokeWidth="1.5"
                  opacity="0.5"
                />

                {/* PLOT EACH CITY HUB WITH RADIATING HEAT BLOBS */}
                {cityStats.map((city) => {
                  const coords = city.coordinates || { x: 300, y: 200 };
                  const isVeryHigh = city.intensityLevel === 4;
                  const isMedHigh = city.intensityLevel === 3;
                  const gradientId = isVeryHigh ? 'url(#heatHigh)' : isMedHigh ? 'url(#heatMed)' : 'url(#heatLow)';
                  
                  // Heat radius scaled with member count
                  const heatRadius = Math.min(Math.max(city.count * 3.5, 18), 58);
                  const coreRadius = Math.min(Math.max(city.count * 1.2, 5), 14);

                  return (
                    <g
                      key={city.ville}
                      className="cursor-pointer transition-transform duration-200 hover:scale-110"
                      onClick={() => setSelectedCity(selectedCity?.ville === city.ville ? null : city)}
                      onMouseEnter={() => setHoveredCity(city)}
                      onMouseLeave={() => setHoveredCity(null)}
                    >
                      {/* Radiating Thermal Heat Halo */}
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r={heatRadius}
                        fill={gradientId}
                        className={isVeryHigh ? 'animate-pulse' : ''}
                      />

                      {/* Core Glowing Dot */}
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r={coreRadius}
                        fill={isVeryHigh ? '#E11D48' : isMedHigh ? '#D97706' : '#335A79'}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="shadow-sm"
                      />

                      {/* Member Count Label Inside Core if large enough */}
                      {coreRadius >= 7 && (
                        <text
                          x={coords.x}
                          y={coords.y + 3.5}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {city.count}
                        </text>
                      )}

                      {/* City Name Label */}
                      <text
                        x={coords.x}
                        y={coords.y - heatRadius * 0.45 - 6}
                        textAnchor="middle"
                        fill="#1E293B"
                        fontSize="10"
                        fontWeight="bold"
                        className="drop-shadow-xs"
                      >
                        {city.ville}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Floating Dynamic Tooltip over hovered / selected city */}
              {(hoveredCity || selectedCity) && (
                <div className="mt-3 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200 shadow-md max-w-md w-full flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#335A79]/10 text-[#335A79] flex items-center justify-center font-bold">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-sm">
                        {(hoveredCity || selectedCity)?.ville} • {(hoveredCity || selectedCity)?.pays}
                      </p>
                      <p className="text-stone-500 text-[11px]">
                        <strong>{(hoveredCity || selectedCity)?.count} membres</strong> ({(hoveredCity || selectedCity)?.percentage}% de la Dahirah)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (hoveredCity || selectedCity) {
                        setSelectedCity(hoveredCity || selectedCity);
                        setViewMode('BARS');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#335A79] hover:bg-[#223c52] text-white font-semibold text-xs transition flex items-center gap-1 shrink-0"
                  >
                    <span>Voir liste</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: DENSITY MATRIX GRID */}
        {viewMode === 'GRID' && (
          <div className="space-y-4">
            <p className="text-xs text-stone-500">
              Répartition matricielle par pôle d'activité et densité de membres :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {cityStats.map((stat, idx) => {
                const styling = getIntensityColor(stat.intensityLevel);

                return (
                  <div
                    key={stat.ville}
                    onClick={() => setSelectedCity(selectedCity?.ville === stat.ville ? null : stat)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${styling.card} hover:shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Pôle #{idx + 1}
                        </span>
                        <h4 className="text-base font-bold text-stone-900 leading-tight">
                          {stat.ville}
                        </h4>
                        <p className="text-xs text-stone-500">{stat.pays}</p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styling.badge} shadow-2xs`}>
                        {stat.count} {stat.count > 1 ? 'membres' : 'membre'}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-stone-200/60 space-y-1.5 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>Poids dans la Dahirah :</span>
                        <strong className="text-stone-900">{stat.percentage}%</strong>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Hommes / Femmes :</span>
                        <span>{stat.menCount} H / {stat.womenCount} F</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Professionnels actifs :</span>
                        <span>{stat.salariedCount + stat.entrepreneursCount}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Étudiants & Élèves :</span>
                        <span>{stat.studentsCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Widget Footer & Members Directory Deep-Link */}
      <div className="p-4 bg-stone-50/70 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>
            Les données territoriales sont actualisées en temps réel à chaque adhésion ou modification de fiche.
          </span>
        </div>

        <button
          onClick={onNavigateToMembersList}
          className="font-semibold text-[#335A79] hover:underline flex items-center gap-1 self-start sm:self-auto shrink-0"
        >
          <span>Filtrer par ville dans le Registre</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
