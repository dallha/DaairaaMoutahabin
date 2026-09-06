import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Member, CategoryRef, ActivityLogItem, Language } from '../types';
import { useTranslation } from '../i18n/translations';
import { OutdatedMembersWidget } from '../components/OutdatedMembersWidget';
import { GeographicDistributionWidget } from '../components/GeographicDistributionWidget';
import { getMembers } from '../services/memberService';

interface AdminDashboardProps {
  categories: CategoryRef[];
  activityLogs: ActivityLogItem[];
  currentLang: Language;
  onNavigate: (view: string) => void;
  onSelectMember: (member: Member) => void;
  onEditMember?: (member: Member) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  activityLogs,
  currentLang,
  onNavigate,
  onSelectMember,
  onEditMember,
}) => {
  const t = useTranslation(currentLang);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await getMembers(50);
        setMembers(response?.members || []);
      } catch (err) {
        setError('Impossible de charger les membres. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#335A79]" /></div>;
  if (error) return <div className="text-red-500 text-center p-8">{error}</div>;

  // Key metrics
  const totalCount = members.length;
  const menCount = members.filter((m) => m.sexe === 'M').length;
  const womenCount = members.filter((m) => m.sexe === 'F').length;

  const studentsCount = members.filter((m) => m.situation === 'ETUDIANT' || m.situation === 'ELEVE').length;
  const salariedCount = members.filter((m) => m.situation === 'SALARIE').length;
  const entrepreneursCount = members.filter((m) => m.situation === 'ENTREPRENEUR').length;
  const independentCount = members.filter((m) => m.situation === 'INDEPENDANT').length;
  const professionalsCount = salariedCount + entrepreneursCount + independentCount;

  // Data quality issues
  const membersWithIssues = Array.isArray(members) 
    ? members.filter((m) => m.dataQualityIssues && m.dataQualityIssues.length > 0)
    : [];

  // Sector breakdown count
  const sectorCounts: Record<string, number> = {};
  members.forEach((m) => {
    m.professions.forEach((p) => {
      const sec = p.secteur || 'Autre';
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    });
  });

  const sortedSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const recentMembers = [...members].slice(0, 5);

  return (
    <section className="space-y-6 pb-12">
      
      {/* Top Welcome Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif italic text-[#335A79] tracking-tight">
            Tableau de Bord & Gouvernance
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Dāʾiratu Al-Mutahābbīna Fillāhi • Shaykh Muhammad Nūruddin Ñas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="admin-btn-add-member"
            onClick={() => onNavigate('add-member')}
            className="px-3.5 py-1.5 rounded-full bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-semibold shadow-xs transition flex items-center space-x-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Nouveau Membre</span>
          </button>

          <button
            id="admin-btn-import"
            onClick={() => onNavigate('import-csv')}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-700 border border-gray-200 text-xs font-medium shadow-2xs transition flex items-center space-x-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#816C07]" />
            <span>Import CSV</span>
          </button>

          <button
            id="admin-btn-export"
            onClick={() => onNavigate('export')}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-50 text-stone-700 border border-gray-200 text-xs font-medium shadow-2xs transition flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Editorial 4-Card Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Membres */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition hover:border-gray-200">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Membres Totaux
          </p>
          <h3 className="text-3xl font-bold text-[#335A79] font-sans">
            {totalCount.toLocaleString()}
          </h3>
          <div className="mt-2 text-[10px] text-green-600 font-medium flex items-center space-x-1">
            <span>+{members.slice(0, 3).length} cette semaine</span>
          </div>
        </div>

        {/* Professionnels */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition hover:border-gray-200">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Professionnels
          </p>
          <h3 className="text-3xl font-bold text-[#816C07] font-sans">
            {professionalsCount}
          </h3>
          <div className="mt-2 text-[10px] text-gray-400">
            {totalCount > 0 ? Math.round((professionalsCount / totalCount) * 100) : 0}% de la dahirah
          </div>
        </div>

        {/* Étudiants / Élèves */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition hover:border-gray-200">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Étudiants / Élèves
          </p>
          <h3 className="text-3xl font-bold text-[#335A79] font-sans">
            {studentsCount}
          </h3>
          <div className="mt-2 text-[10px] text-gray-400">
            Aide aux devoirs active
          </div>
        </div>

        {/* Entrepreneurs */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition hover:border-gray-200">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
            Entrepreneurs
          </p>
          <h3 className="text-3xl font-bold text-[#816C07] font-sans">
            {entrepreneursCount}
          </h3>
          <div className="mt-2 text-[10px] text-blue-500 font-medium">
            Réseautage B2B
          </div>
        </div>

      </div>

      {/* Main Content Grid: Inscriptions Récentes (2 cols) & Journal d'activité (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inscriptions Récentes Table (Editorial Design) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h4 className="font-serif text-lg text-[#335A79]">
              Inscriptions Récentes
            </h4>
            <button
              onClick={() => onNavigate('admin-members')}
              className="text-xs font-semibold text-[#816C07] hover:underline"
            >
              Voir tout
            </button>
          </div>

          <div className="flex-1 overflow-x-auto p-2">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase text-gray-400 border-b border-gray-50">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Membre</th>
                  <th className="px-4 py-2.5 font-bold">Profession / Situation</th>
                  <th className="px-4 py-2.5 font-bold">Fonction Dahirah</th>
                  <th className="px-4 py-2.5 font-bold">Statut</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {recentMembers.map((member, idx) => {
                  const initials = `${member.prenom[0] || ''}${member.nom[0] || ''}`;
                  const isGold = idx % 2 === 1;
                  const primaryProf = member.professions[0];
                  const primaryFunction = member.fonctionsDahirah[0];

                  return (
                    <tr
                      key={member.id}
                      onClick={() => onSelectMember(member)}
                      className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                            isGold
                              ? 'bg-[#816C07]/10 border border-[#816C07]/20 text-[#816C07]'
                              : 'bg-[#335A79]/10 border border-[#335A79]/20 text-[#335A79]'
                          }`}
                        >
                          {initials || 'DM'}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 leading-tight">
                            {member.prenom} {member.nom}
                          </p>
                          <p className="text-[9px] text-gray-400 italic">
                            {member.ville || 'Dakar'}, {member.pays || 'Sénégal'}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {primaryProf ? (
                            <>
                              <span className="px-1.5 py-0.5 bg-blue-50 text-[#335A79] rounded text-[9px] font-medium">
                                {primaryProf.secteur || 'Secteur'}
                              </span>
                              <span className="px-1.5 py-0.5 bg-amber-50 text-[#816C07] rounded text-[9px] font-medium">
                                {primaryProf.metier}
                              </span>
                            </>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px]">
                              {member.situation}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-gray-600">
                        {primaryFunction ? primaryFunction.titre : 'Membre'}
                      </td>

                      <td className="px-4 py-3">
                        {member.dataQualityIssues && member.dataQualityIssues.length > 0 ? (
                          <span className="inline-flex items-center text-[11px] font-medium text-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block mr-1.5" />
                            En attente
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[11px] font-medium text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5" />
                            Validé
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deep Blue Featured Card: Journal d'activité & Secteurs Clés */}
        <div className="bg-[#335A79] rounded-3xl p-6 text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
          {/* Ambient Circular Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

          <div className="z-10">
            <h4 className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-3">
              Journal d'activité
            </h4>
            <div className="space-y-4">
              {activityLogs.slice(0, 3).map((log, i) => (
                <div key={log.id || i} className="flex space-x-3">
                  <div className="w-6 h-6 rounded-full bg-[#816C07] text-white flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-xs">
                    {i === 0 ? '+' : i === 1 ? '✎' : '↓'}
                  </div>
                  <div className="text-xs">
                    <p className="opacity-90 leading-tight">
                      <strong>{log.userName}</strong>: {log.action}
                    </p>
                    <p className="text-[10px] opacity-50 mt-0.5">{log.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 z-10">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-[10px] uppercase font-bold opacity-60">
                Secteurs Clés
              </h5>
              <button
                onClick={() => onNavigate('taxonomies-categories')}
                className="text-[10px] text-[#E6CD6B] hover:underline"
              >
                Voir détails
              </button>
            </div>
            <div className="space-y-2.5">
              {sortedSectors.slice(0, 3).map(([sector, count]) => {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={sector} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="opacity-80 truncate max-w-[160px]">{sector}</span>
                      <span className="font-bold text-[#F5E8A3]">{pct}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-[#816C07] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(pct * 2.5, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Visualisation territoriale : Graphique à Barres Horizontales & Carte Thermique */}
      <GeographicDistributionWidget
        members={members}
        onSelectMember={onSelectMember}
        onNavigateToMembersList={() => onNavigate('admin-members')}
      />

      {/* Widget de synthèse : Fiches membres nécessitant une mise à jour immédiate */}
      <OutdatedMembersWidget
        members={members}
        onSelectMember={onSelectMember}
        onEditMember={onEditMember}
        onNavigateToMembersList={() => onNavigate('admin-members')}
      />

      {/* Editorial Bottom Reference Navigation Banner */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-serif italic text-[#335A79] flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#816C07]" />
            <span>Référentiels & Taxonomies Normalisées</span>
          </h4>
          <p className="text-xs text-stone-500">
            Harmonisation des intitulés de métiers, cursus académiques et charges statutaires de la Dahirah.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('taxonomies-professions')}
            className="px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 border border-gray-200 text-stone-800 text-xs font-medium rounded-full transition"
          >
            Professions
          </button>
          <button
            onClick={() => onNavigate('taxonomies-categories')}
            className="px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 border border-gray-200 text-stone-800 text-xs font-medium rounded-full transition"
          >
            Catégories
          </button>
          <button
            onClick={() => onNavigate('taxonomies-formations')}
            className="px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 border border-gray-200 text-stone-800 text-xs font-medium rounded-full transition"
          >
            Formations
          </button>
          <button
            onClick={() => onNavigate('taxonomies-functions')}
            className="px-3 py-1.5 bg-[#F8F8F8] hover:bg-gray-100 border border-gray-200 text-stone-800 text-xs font-medium rounded-full transition"
          >
            Fonctions Dahirah
          </button>
        </div>
      </div>

    </section>
  );
};
