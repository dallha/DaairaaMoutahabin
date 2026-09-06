import React from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  ShieldCheck,
  Edit3,
  ArrowLeft,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Share2,
  Sparkles,
  Building,
  BookOpen
} from 'lucide-react';
import { Member, UserRole, Language } from '../types';
import { useTranslation } from '../i18n/translations';

interface MemberProfileViewProps {
  member: Member;
  currentRole: UserRole;
  currentLang: Language;
  onBack: () => void;
  onEdit: () => void;
  isCurrentUser?: boolean;
}

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  member,
  currentRole,
  currentLang,
  onBack,
  onEdit,
  isCurrentUser = false,
}) => {
  const t = useTranslation(currentLang);
  const isAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN';
  const isMember = currentRole === 'MEMBER';

  // Privacy checks
  const canSeePhone = isAdmin || isCurrentUser || member.privacy.showPhone === 'PUBLIC' || (isMember && member.privacy.showPhone === 'MEMBRES');
  const canSeeEmail = isAdmin || isCurrentUser || member.privacy.showEmail === 'PUBLIC' || (isMember && member.privacy.showEmail === 'MEMBRES');
  const canSeeAddress = isAdmin || isCurrentUser || member.privacy.showAddress === 'PUBLIC' || (isMember && member.privacy.showAddress === 'MEMBRES');

  const getSituationBadge = (situation: string) => {
    switch (situation) {
      case 'ETUDIANT':
        return { label: 'Étudiant(e)', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'ELEVE':
        return { label: 'Élève', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ENTREPRENEUR':
        return { label: 'Entrepreneur', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'SALARIE':
        return { label: 'Salarié(e) / Cadre', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'INDEPENDANT':
        return { label: 'Indépendant / Artisan', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: situation, bg: 'bg-stone-50 text-stone-700 border-stone-200' };
    }
  };

  const sitBadge = getSituationBadge(member.situation);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* Top Header bar with Back button and Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.back}</span>
        </button>

        <div className="flex items-center gap-2">
          {(isCurrentUser || isAdmin) && (
            <button
              id="edit-profile-btn"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#335A79] hover:bg-[#223c52] text-white text-xs font-medium shadow-xs transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isCurrentUser ? t.navEditProfile : 'Modifier ce membre'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        
        {/* Banner with Hadara brand colors and ambient circle */}
        <div className="h-28 sm:h-36 bg-[#335A79] relative px-6 flex items-end overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute right-6 top-4 font-serif italic text-white/10 text-5xl pointer-events-none select-none">
            دائرة المتحابين
          </div>
        </div>

        {/* Profile info header content */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4">
            
            {/* Avatar & Main names */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#816C07] text-white flex items-center justify-center font-serif font-bold text-2xl sm:text-3xl shadow-md border-4 border-white ring-1 ring-gray-100">
                {member.prenom[0]}{member.nom ? member.nom[0] : ''}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-serif italic text-stone-900 tracking-tight">
                    {member.prenom} {member.nom || '(Nom de famille non renseigné)'}
                  </h1>
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${sitBadge.bg}`}>
                    {sitBadge.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  <span className="font-mono text-[#816C07] font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                    {member.matricule}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {member.ville}, {member.pays}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    Membre depuis {member.dateInscription}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Status Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compte {member.statutCompte}</span>
              </span>
            </div>

          </div>

          {/* Quality warning if any */}
          {member.dataQualityIssues && member.dataQualityIssues.length > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Vérification administrative requise :</span>
                <ul className="list-disc list-inside mt-0.5 text-amber-800 space-y-0.5">
                  {member.dataQualityIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Structured Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column (1/3): Identité & Coordonnées & Confidentialité */}
        <div className="space-y-6">
          
          {/* SECTION: IDENTITÉ */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-serif italic text-[#335A79] uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <User className="w-4 h-4 text-[#335A79]" />
              <span>{t.identity}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Nom complet</span>
                <p className="font-semibold text-stone-800">{member.prenom} {member.nom || '—'}</p>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Sexe</span>
                <p className="font-medium text-stone-800">
                  {member.sexe === 'F' ? 'Féminin' : member.sexe === 'M' ? 'Masculin' : 'Non précisé'}
                </p>
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Date & Lieu de naissance</span>
                <p className="font-medium text-stone-800">
                  {member.dateNaissance ? (
                    <>
                      {member.dateNaissance} {member.lieuNaissance && `à ${member.lieuNaissance}`}
                    </>
                  ) : (
                    <span className="text-stone-400 italic">Non renseignée</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION: COORDONNÉES SELON PERMISSIONS */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-serif italic text-[#335A79] uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#335A79]" />
                <span>{t.contactInfo}</span>
              </h3>
              {!isAdmin && !isCurrentUser && (
                <span className="text-[10px] text-stone-400 flex items-center gap-1" title="Filtré selon le niveau de confidentialité">
                  <Lock className="w-3 h-3" />
                  Filtré
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Téléphone</span>
                {canSeePhone ? (
                  <p className="font-mono font-medium text-stone-800">
                    {member.telephone || <span className="text-stone-400 italic">Aucun numéro</span>}
                  </p>
                ) : (
                  <p className="text-stone-400 italic flex items-center gap-1 text-[11px]">
                    <Lock className="w-3 h-3 text-stone-300" />
                    Masqué par l’adhérent
                  </p>
                )}
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Email</span>
                {canSeeEmail ? (
                  <p className="font-medium text-stone-800 break-all">
                    {member.email || <span className="text-stone-400 italic">Non renseigné</span>}
                  </p>
                ) : (
                  <p className="text-stone-400 italic flex items-center gap-1 text-[11px]">
                    <Lock className="w-3 h-3 text-stone-300" />
                    Visible uniquement aux administrateurs
                  </p>
                )}
              </div>

              <div>
                <span className="text-stone-400 block text-[11px]">Adresse & Ville</span>
                <p className="font-medium text-stone-800">
                  {member.ville}, {member.pays}
                </p>
                {canSeeAddress && member.adresse && (
                  <p className="text-stone-500 text-[11px] mt-0.5">{member.adresse}</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: SITUATION SOCIOPROFESSIONNELLE */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-xs font-serif italic text-[#335A79] uppercase tracking-wider flex items-center gap-2 border-b border-gray-100 pb-2.5">
              <Briefcase className="w-4 h-4 text-[#816C07]" />
              <span>{t.situation}</span>
            </h3>

            <div className="text-xs space-y-1">
              <span className="text-stone-400 block text-[11px]">Statut principal</span>
              <p className="text-sm font-semibold text-stone-900 capitalize">
                {sitBadge.label}
              </p>
              <p className="text-[11px] text-stone-500">
                Classé dans les effectifs actifs de la Dahirah
              </p>
            </div>
          </div>

        </div>

        {/* Right Column (2/3): Professions (Multiprofessions), Formations, Fonctions Dahirah, Activités */}
        <div className="md:col-span-2 space-y-6">
          
          {/* SECTION: PROFESSIONS & MÉTIERS (MULTI-PROFESSION SUPPORTED!) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-serif italic text-[#335A79] tracking-tight flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#335A79]" />
                  <span>{t.professions} ({member.professions.length})</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Activités professionnelles, compétences et métiers exercés
                </p>
              </div>

              <span className="text-[11px] text-[#816C07] font-semibold bg-[#816C07]/10 px-2.5 py-0.5 rounded-full">
                Multi-compétences
              </span>
            </div>

            {member.professions.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Aucune profession enregistrée pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {member.professions.map((p, index) => (
                  <div
                    key={p.id || index}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-50 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
                        <span>{p.metier}</span>
                        {p.isPrincipale && (
                          <span className="text-[10px] bg-[#335A79] text-white px-2 py-0.2 rounded font-medium">
                            Principale
                          </span>
                        )}
                      </h4>
                      <span className="text-[10px] font-medium text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded">
                        {p.secteur}
                      </span>
                    </div>

                    {p.activite && (
                      <p className="text-xs text-stone-600">
                        {p.activite}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: FONCTION DANS LA DAHIRAH (MULTI-FONCTIONS) */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-serif italic text-[#335A79] tracking-tight flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#816C07]" />
                  <span>{t.functionsDahirah}</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Responsabilités spirituelles, administratives et logistiques
                </p>
              </div>

              <span className="text-[11px] text-[#335A79] font-semibold bg-[#335A79]/10 px-2.5 py-0.5 rounded-full">
                Engagement Dahirah
              </span>
            </div>

            {member.fonctionsDahirah.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Membre général de la Dahirah.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {member.fonctionsDahirah.map((fn, index) => (
                  <div
                    key={fn.id || index}
                    className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-950">
                        {fn.role}
                      </h4>
                      {fn.isActif && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" title="Rôle actif" />
                      )}
                    </div>
                    {fn.pole && (
                      <p className="text-[11px] font-medium text-[#816C07]">
                        {fn.pole}
                      </p>
                    )}
                    {fn.dateNomination && (
                      <p className="text-[10px] text-stone-400">
                        Nomination : {fn.dateNomination}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: FORMATION & DIPLÔMES */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-serif italic text-[#335A79] tracking-tight flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#335A79]" />
                <span>{t.formation}</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Parcours académique, études islamiques & qualifications professionnelles
              </p>
            </div>

            {member.formations.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Aucune formation renseignée.
              </p>
            ) : (
              <div className="space-y-3">
                {member.formations.map((f, index) => (
                  <div
                    key={f.id || index}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-stone-900">
                        {f.diplome}
                      </h4>
                      {f.annee && (
                        <span className="text-[11px] font-mono text-stone-500 font-medium">
                          {f.annee}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-700">
                      {f.domaine} • <span className="font-medium text-stone-900">{f.niveau}</span>
                    </p>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Building className="w-3 h-3 text-stone-400" />
                      {f.etablissement}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: ACTIVITÉS & ENGAGEMENTS */}
          {member.activites && member.activites.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2 border-b border-stone-100 pb-3">
                <Sparkles className="w-4 h-4 text-[#816C07]" />
                <span>{t.activities}</span>
              </h3>

              <div className="flex flex-wrap gap-2">
                {member.activites.map((act, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-lg bg-stone-100 text-stone-700 text-xs font-medium border border-stone-200/80"
                  >
                    {act}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
