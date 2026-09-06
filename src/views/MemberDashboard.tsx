import React from 'react';
import {
  User,
  Users,
  Calendar,
  DollarSign,
  Edit3,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Award,
  Bell,
  MapPin
} from 'lucide-react';
import { Member, Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface MemberDashboardProps {
  member: Member;
  currentLang: Language;
  onNavigate: (view: string) => void;
  onEditProfile: () => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  member,
  currentLang,
  onNavigate,
  onEditProfile,
}) => {
  const t = useTranslation(currentLang);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Welcome Spiritual Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#223c52] to-[#335A79] text-white p-6 sm:p-8 shadow-xs border border-[#335A79]">
        <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none text-8xl font-arabic-calligraphy text-white">
          دائرة المتحابين
        </div>
        
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs text-[#F5E8A3] font-medium border border-white/15">
            <Sparkles className="w-3.5 h-3.5" />
            <span>As-Salāmu ʿalaykum wa Rahmatullāhi wa Barakātuh</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Bienvenue dans votre espace, {member.prenom} {member.nom}
          </h1>

          <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
            Consultez les activités de la Dahirah, maintenez à jour vos compétences dans l’annuaire et échangez avec vos frères et sœurs en Dieu.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('my-profile')}
              className="px-4 py-2 rounded-xl bg-white text-[#335A79] hover:bg-stone-100 text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5" />
              <span>Consulter mon profil complet</span>
            </button>
            <button
              onClick={onEditProfile}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium transition flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier mes informations</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Profile Summary card + Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile snapshot card */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#335A79] text-white flex items-center justify-center font-bold text-base shadow-xs ring-2 ring-stone-100">
                {member.prenom[0]}{member.nom ? member.nom[0] : ''}
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                  {member.prenom} {member.nom}
                </h3>
                <span className="text-[11px] font-mono text-[#816C07] font-semibold">
                  {member.matricule}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>{member.statutCompte}</span>
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-stone-400 text-[11px] block uppercase tracking-wider font-semibold">
                Situation
              </span>
              <p className="font-medium text-stone-800 mt-0.5 capitalize">
                {member.situation.toLowerCase()}
              </p>
            </div>

            <div>
              <span className="text-stone-400 text-[11px] block uppercase tracking-wider font-semibold">
                Professions déclarées ({member.professions.length})
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {member.professions.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#335A79]/10 text-[#335A79] font-medium text-[11px]"
                  >
                    <Briefcase className="w-3 h-3" />
                    <span>{p.metier}</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-stone-400 text-[11px] block uppercase tracking-wider font-semibold">
                Fonctions dans la Dahirah
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {member.fonctionsDahirah.map((fn) => (
                  <span
                    key={fn.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#816C07]/10 text-[#816C07] font-medium text-[11px]"
                  >
                    <Award className="w-3 h-3" />
                    <span>{fn.role}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {member.ville}, {member.pays}
              </span>
              <span className="text-[11px]">
                Inscrit le {member.dateInscription}
              </span>
            </div>
          </div>
        </div>

        {/* Next Events & Annonces */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick shortcuts row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onNavigate('directory')}
              className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs hover:border-[#335A79] hover:shadow-xs transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#335A79] flex items-center justify-center group-hover:scale-105 transition">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900">Annuaire</p>
                <p className="text-[11px] text-stone-500">34 membres répertoriés</p>
              </div>
            </button>

            <button
              onClick={onEditProfile}
              className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs hover:border-[#335A79] hover:shadow-xs transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#816C07] flex items-center justify-center group-hover:scale-105 transition">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900">Mettre à jour</p>
                <p className="text-[11px] text-stone-500">Mon profil & talents</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('community-events')}
              className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs hover:border-[#335A79] hover:shadow-xs transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900">Événements</p>
                <p className="text-[11px] text-stone-500">Hadara & réunions</p>
              </div>
            </button>

            <button
              onClick={() => onNavigate('community-contributions')}
              className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs hover:border-[#335A79] hover:shadow-xs transition text-left space-y-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-900">Cotisations</p>
                <p className="text-[11px] text-stone-500">Taysir & adhésion</p>
              </div>
            </button>
          </div>

          {/* Upcoming community activities */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#335A79]" />
                <span>Prochaines Rencontres & Activités Spirituelles</span>
              </h3>
              <button
                onClick={() => onNavigate('community-events')}
                className="text-xs font-medium text-[#335A79] hover:underline"
              >
                Tout voir →
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#335A79]/10 text-[#335A79] font-semibold text-[10px]">
                      HADARA HEBDOMADAIRE
                    </span>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-500 font-medium">Vendredi 17h00</span>
                  </div>
                  <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">
                    Hadratu-l-Jumah & Wazifa Solennelle
                  </h4>
                  <p className="text-stone-600 text-[11px]">
                    Siège de la Dahirah & Mosquée Médina Baye. Récitations de la Hailala et causerie de Shaykh Muhammad Nūruddin Ñas.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('community-events')}
                  className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg font-medium text-stone-700 hover:bg-stone-100 shrink-0"
                >
                  Confirmer présence
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#816C07]/10 text-[#816C07] font-semibold text-[10px]">
                      COLLOQUE ANNUEL
                    </span>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-500 font-medium">25 Septembre 2026</span>
                  </div>
                  <h4 className="font-semibold text-stone-900 text-xs sm:text-sm">
                    Foi, Éducation & Compétences Professionnelles
                  </h4>
                  <p className="text-stone-600 text-[11px]">
                    Grand Théâtre National. Tables rondes réunissant cadres, chercheurs et artisans de la communauté.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('community-events')}
                  className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg font-medium text-stone-700 hover:bg-stone-100 shrink-0"
                >
                  Détails
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
