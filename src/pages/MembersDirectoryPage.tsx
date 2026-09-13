import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMembers } from '../services/memberService';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';

export const MembersDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const searchTerm = searchParams.get('search') || '';
  const filterPôle = searchParams.get('pole') || '';
  const filterStatut = searchParams.get('statut') || '';
  const filterSituation = searchParams.get('situation') || '';

  const getSituationLabel = (sit: string) => {
    switch (sit.toUpperCase()) {
      case 'LEARNER':
      case 'APPRENANT':
        return 'Élèves & Étudiants (Apprenants)';
      case 'STUDENT':
      case 'ETUDIANT':
        return 'Étudiants Universitaires';
      case 'PUPIL':
      case 'ELEVE':
        return 'Élèves';
      case 'PROFESSIONAL':
      case 'PROFESSIONNEL':
        return 'Professionnels en Activité';
      case 'JOB_SEEKER':
      case 'SANS_EMPLOI':
        return 'En Recherche d\'Emploi';
      default:
        return sit;
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchMembers() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getMembers(50, 1, filterSituation || undefined);
        if (isMounted) {
          let list = response.members || [];

          // Filtrage côté client pour réactivité instantanée
          if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            list = list.filter(
              (m) =>
                m.nom.toLowerCase().includes(lower) ||
                m.prenom.toLowerCase().includes(lower) ||
                m.matricule.toLowerCase().includes(lower) ||
                (m.email && m.email.toLowerCase().includes(lower))
            );
          }

          if (filterStatut) {
            list = list.filter((m) => m.statutCompte === filterStatut);
          }

          setMembers(list);
          setTotalCount(response.totalCount || list.length);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erreur lors du chargement de l’annuaire.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [searchTerm, filterPôle, filterStatut, filterSituation]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const newParams = new URLSearchParams(searchParams);
    if (val) {
      newParams.set('search', val);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const isEditor = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'agent';

  return (
    <div className="flex flex-col gap-6">
      
      {/* En-tête de section Annuaire */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl">
        <div>
          <h1 className="font-headline-lg text-2xl font-semibold text-[#e5e9f2] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[28px]">groups</span>
            Annuaire Communautaire des Membres
          </h1>
          <p className="text-xs text-[#9ca7b8] mt-1">
            Répertoire officiel et souverain des disciples • Dāʾiratu Al-Mutahābbīna Fillāhi
          </p>
        </div>

        {isEditor && (
          <Link
            to="/members/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e9c349] via-[#f2ca50] to-[#d4af37] text-slate-950 font-bold shadow-[0_4px_18px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition text-xs"
          >
            <span className="material-symbols-outlined text-[18px] font-bold">person_add</span>
            <span>+ Nouvel Enrôlement</span>
          </Link>
        )}
      </div>

      {/* Barre de Recherche & Filtres */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl bg-[#111722] border border-[#2b3547]/60">
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#f2ca50] text-[19px]">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Rechercher par nom, prénom, matricule (ex: DM-2026-0001)..."
            className="w-full bg-[#06090e] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none border border-[#2b3547] focus:border-[#f2ca50] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#9ca7b8] whitespace-nowrap pl-2">
            {totalCount} membres affichés
          </span>
        </div>
      </div>

      {filterSituation && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e2638] border border-[#f2ca50]/40 text-xs text-[#e5e9f2] w-fit shadow-sm">
          <span className="material-symbols-outlined text-[17px] text-[#f2ca50]">filter_alt</span>
          <span>Filtre appliqué : <strong className="text-[#f2ca50]">{getSituationLabel(filterSituation)}</strong> ({totalCount})</span>
          <button
            onClick={() => {
              const p = new URLSearchParams(searchParams);
              p.delete('situation');
              setSearchParams(p);
            }}
            className="ml-2 px-2 py-0.5 rounded-lg bg-[#111722] hover:bg-[#2b3547] text-[#9ca7b8] hover:text-[#f2ca50] transition flex items-center gap-1 text-[11px] border border-[#2b3547]"
            title="Effacer le filtre"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            <span>Tous les membres</span>
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Table des Membres */}
      <div className="rounded-2xl bg-[#151c28]/90 border border-[#2b3547]/60 shadow-xl overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs font-body-md">
            <thead>
              <tr className="bg-[#111722] text-[#9ca7b8] text-[11px] font-bold uppercase tracking-wider border-b border-[#2b3547]/40">
                <th className="py-3.5 px-5">Membre &amp; Matricule</th>
                <th className="py-3.5 px-4">Profession &amp; Titre</th>
                <th className="py-3.5 px-4">Pôle / Ville</th>
                <th className="py-3.5 px-4">Statut Compte</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b3547]/20">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9ca7b8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-[#f2ca50]">refresh</span>
                      <span>Chargement des fiches membres...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#9ca7b8]">
                    Aucun membre ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="group hover:bg-[#1b2332]/60 transition-colors">
                    
                    {/* Identité & Matricule */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#111722] border border-[#f2ca50]/30 text-[#f2ca50] flex items-center justify-center font-bold text-xs shadow-inner">
                          {member.prenom?.[0] || 'M'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <Link
                            to={`/members/${member.matricule || member.id}`}
                            className="font-semibold text-sm text-[#e5e9f2] group-hover:text-[#f2ca50] transition-colors"
                          >
                            {member.prenom} {member.nom}
                          </Link>
                          <span className="text-[11px] text-[#9ca7b8] font-mono">{member.matricule}</span>
                        </div>
                      </div>
                    </td>

                    {/* Profession */}
                    <td className="py-3.5 px-4 text-[#e5e9f2]">
                      <div className="flex flex-col">
                        <span className="font-medium">{member.professionActuelle || 'Adhérent'}</span>
                        <span className="text-[11px] text-[#9ca7b8]">{member.situation || 'Membre'}</span>
                      </div>
                    </td>

                    {/* Ville / Pôle */}
                    <td className="py-3.5 px-4 text-[#9ca7b8]">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-[#bfcfed]">location_on</span>
                        <span>{member.ville || 'Dakar'}</span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 border border-[#f2ca50]/30 text-[#f2ca50] text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>
                        {member.statutCompte || 'ACTIF'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/members/${member.matricule || member.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#242e40] hover:bg-[#f2ca50] hover:text-slate-950 text-[#e5e9f2] text-xs font-semibold transition"
                          title="Consulter la fiche individuelle"
                        >
                          <span>Fiche</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                        {isEditor && (
                          <Link
                            to={`/members/${member.matricule || member.id}/edit`}
                            className="p-1.5 rounded-lg bg-[#242e40]/70 hover:bg-[#ffb95f] hover:text-slate-950 text-[#9ca7b8] transition"
                            title="Modifier ce membre"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </Link>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
