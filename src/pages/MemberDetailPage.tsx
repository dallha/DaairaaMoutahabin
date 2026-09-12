import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getMemberById } from '../services/memberService';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';

export const MemberDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMember() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const found = await getMemberById(id);
        if (isMounted) {
          if (found) {
            setMember(found);
          } else {
            setError(`Fiche membre introuvable pour l'identifiant ou le matricule "${id}".`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur lors de la récupération de la fiche.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMember();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const isEditor = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'agent';

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-[#f2ca50] gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">refresh</span>
        <span className="text-sm text-[#9ca7b8]">Chargement de la fiche {id}...</span>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-[#151c28] border border-amber-500/30 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 text-[#f2ca50] flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">person_off</span>
        </div>
        <h2 className="font-headline-sm text-xl font-bold text-[#e5e9f2]">Fiche Non Trouvée</h2>
        <p className="text-xs text-[#9ca7b8]">{error || 'Le membre demandé n’existe pas dans les registres officiels.'}</p>
        <Link
          to="/members"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#242e40] text-[#f2ca50] font-semibold text-xs hover:bg-[#f2ca50] hover:text-slate-950 transition"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Retourner à l'Annuaire</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      
      {/* Barre d'Action & Navigation Fiche */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/members')}
          className="inline-flex items-center gap-1.5 text-xs text-[#9ca7b8] hover:text-[#f2ca50] transition font-medium"
        >
          <span className="material-symbols-outlined text-[17px]">arrow_back</span>
          <span>Annuaire des membres</span>
        </button>

        <div className="flex items-center gap-2">
          {isEditor && (
            <Link
              to={`/members/${member.matricule || member.id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 text-xs font-bold shadow-md hover:brightness-110 transition"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Modifier la Fiche</span>
            </Link>
          )}
        </div>
      </div>

      {/* Carte d'Identité Souveraine */}
      <div className="rounded-2xl bg-[#151c28]/95 border border-[#2b3547]/80 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/70 to-transparent"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-[#2b3547]/40">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#111722] to-[#242e40] border-2 border-[#f2ca50]/40 flex items-center justify-center text-[#f2ca50] text-3xl font-headline-lg font-bold shadow-xl">
            {member.photo ? (
              <img src={member.photo} alt={member.prenom} className="w-full h-full object-cover rounded-2xl" />
            ) : (
              <span>{member.prenom[0]}</span>
            )}
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#151c28]"></span>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-xs font-mono font-bold tracking-wider">
                {member.matricule}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {member.statutCompte || 'ACTIF'}
              </span>
            </div>

            <h1 className="font-headline-lg text-2xl sm:text-3xl font-semibold text-[#e5e9f2] tracking-tight">
              {member.prenom} {member.nom}
            </h1>

            {member.nomArabe && (
              <span className="font-headline-md text-lg text-[#f2ca50] mt-0.5 font-normal">
                {member.nomArabe}
              </span>
            )}
          </div>
        </div>

        {/* Détails en Grille Bento 2x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          
          {/* Section 1 : État Civil & Identité */}
          <div className="space-y-4 p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40">
            <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">badge</span>
              État Civil &amp; Situation
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Genre :</span>
                <span className="font-medium text-[#e5e9f2]">{member.sexe === 'F' ? 'Femme' : 'Homme'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Situation :</span>
                <span className="font-medium text-[#e5e9f2]">{member.situation || 'Non précisé'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Profession :</span>
                <span className="font-medium text-[#e5e9f2]">{member.professionActuelle || 'Adhérent'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9ca7b8]">Date d'affiliation :</span>
                <span className="font-medium text-[#e5e9f2] font-mono">{member.dateInscription || '2026-01-01'}</span>
              </div>
            </div>
          </div>

          {/* Section 2 : Coordonnées & Localisation */}
          <div className="space-y-4 p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40">
            <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">contact_phone</span>
              Coordonnées &amp; Localisation
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Téléphone :</span>
                <span className="font-medium text-[#e5e9f2] font-mono">
                  {member.telephone ? member.telephone : <span className="text-[#788294] italic">Confidentiel / Non renseigné</span>}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Courriel :</span>
                <span className="font-medium text-[#e5e9f2]">
                  {member.email ? member.email : <span className="text-[#788294] italic">Non renseigné</span>}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2b3547]/20">
                <span className="text-[#9ca7b8]">Ville / Pôle :</span>
                <span className="font-medium text-[#e5e9f2]">{member.ville || 'Dakar'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9ca7b8]">Pays :</span>
                <span className="font-medium text-[#e5e9f2]">{member.pays || 'Sénégal'}</span>
              </div>
            </div>
          </div>

          {/* Section 3 : Fonctions Dahirah */}
          <div className="space-y-4 p-5 rounded-xl bg-[#111722]/80 border border-[#2b3547]/40 md:col-span-2">
            <h3 className="font-headline-sm text-sm font-semibold text-[#f2ca50] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Fonctions &amp; Commissions Dahirah
            </h3>
            {member.fonctionsDahirah && member.fonctionsDahirah.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {member.fonctionsDahirah.map((f) => (
                  <div key={f.id} className="p-3 rounded-lg bg-[#151c28] border border-[#2b3547]/50 text-xs">
                    <p className="font-semibold text-[#e5e9f2]">{f.role}</p>
                    <p className="text-[#9ca7b8] text-[11px]">{f.pole || 'Commission Générale'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9ca7b8]">Membre affilié à la communauté générale de la Dahirah.</p>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
