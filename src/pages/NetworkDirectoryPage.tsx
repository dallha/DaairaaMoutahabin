import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  searchNetwork,
  getSkillCategories,
  getSkills,
  fetchMemberNeeds,
  createMemberNeed,
  resolveMemberNeed,
  fetchNeedMatches,
  fetchConnectionRequests,
  createConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getMemberAvailability,
  saveMemberAvailability,
  getMemberSkills,
  addMemberSkill,
  deleteMemberSkill,
  getMemberServices,
  addMemberService,
  deleteMemberService,
  NetworkMemberCard,
  SkillCategory,
  Skill,
  MemberNeedDTO,
  NeedMatchCandidateDTO,
  ConnectionRequestDTO,
  MemberAvailability,
  MemberSkill as MemberSkillType,
  MemberServiceOffer,
} from '../services/networkService';

type ActiveDoor = 'search' | 'needs' | 'help';

export const NetworkDirectoryPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Porte active (1: Je cherche, 2: J'ai besoin d'aide, 3: Je peux aider)
  const initialTab = (searchParams.get('tab') as ActiveDoor) || 'search';
  const [activeDoor, setActiveDoor] = useState<ActiveDoor>(initialTab);

  // --------------------------------------------------------------------------
  // PORTE 1 : JE CHERCHE (Moteur de recherche intentionnelle déterministe)
  // --------------------------------------------------------------------------
  const [members, setMembers] = useState<NetworkMemberCard[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isSearchLoading, setIsSearchLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skillsList, setSkillsList] = useState<Skill[]>([]);

  const selectedIntent = searchParams.get('intent') || '';
  const searchTerm = searchParams.get('search') || '';
  const filterSector = searchParams.get('sector') || '';
  const filterSkill = searchParams.get('skill') || '';
  const filterCity = searchParams.get('city') || '';
  const filterAvailableOnly = searchParams.get('available_only') === 'true';

  // --------------------------------------------------------------------------
  // PORTE 2 : J'AI BESOIN D'AIDE (Besoins d'entraide & Mises en relation)
  // --------------------------------------------------------------------------
  const [needs, setNeeds] = useState<MemberNeedDTO[]>([]);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequestDTO[]>([]);
  const [isNeedsLoading, setIsNeedsLoading] = useState<boolean>(false);

  // Modals Porte 2
  const [isNewNeedModalOpen, setIsNewNeedModalOpen] = useState<boolean>(false);
  const [newNeedTitle, setNewNeedTitle] = useState('');
  const [newNeedType, setNewNeedType] = useState('MENTORSHIP');
  const [newNeedDesc, setNewNeedDesc] = useState('');
  const [newNeedUrgency, setNewNeedUrgency] = useState<'NORMAL' | 'HIGH' | 'CRITICAL'>('NORMAL');
  const [newNeedAnonymous, setNewNeedAnonymous] = useState(false);

  // Matching explicable modal
  const [matchingNeed, setMatchingNeed] = useState<MemberNeedDTO | null>(null);
  const [needMatches, setNeedMatches] = useState<NeedMatchCandidateDTO[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState<boolean>(false);
  const [connectMessage, setConnectMessage] = useState<string>('');
  const [connectingTargetId, setConnectingTargetId] = useState<string | null>(null);

  // Sollicitation directe depuis Porte 1
  const [directConnectTarget, setDirectConnectTarget] = useState<NetworkMemberCard | null>(null);
  const [directConnectMessage, setDirectConnectMessage] = useState<string>('');

  // --------------------------------------------------------------------------
  // PORTE 3 : JE PEUX AIDER (Disponibilités, compétences et offres de service)
  // --------------------------------------------------------------------------
  const [myAvailability, setMyAvailability] = useState<MemberAvailability | null>(null);
  const [mySkills, setMySkills] = useState<MemberSkillType[]>([]);
  const [myServices, setMyServices] = useState<MemberServiceOffer[]>([]);
  const [isHelpLoading, setIsHelpLoading] = useState<boolean>(false);

  // Ajout compétence
  const [newSkillId, setNewSkillId] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('INTERMEDIATE');

  // Ajout service
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServiceDesc, setNewServiceDesc] = useState('');
  const [newServiceType, setNewServiceType] = useState('VOLUNTEER');

  // Messages d'action
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Synchronisation de la porte dans l'URL
  const handleSelectDoor = (door: ActiveDoor) => {
    setActiveDoor(door);
    const p = new URLSearchParams(searchParams);
    p.set('tab', door);
    setSearchParams(p);
  };

  // Chargement référentiels
  useEffect(() => {
    async function loadRefs() {
      const [cats, sks] = await Promise.all([getSkillCategories(), getSkills()]);
      setCategories(cats);
      setSkillsList(sks);
    }
    loadRefs();
  }, []);

  // Chargement Porte 1 (Recherche)
  useEffect(() => {
    if (activeDoor !== 'search') return;
    let isMounted = true;
    async function fetchResults() {
      setIsSearchLoading(true);
      try {
        const res = await searchNetwork({
          intent: (selectedIntent as any) || undefined,
          search: searchTerm || undefined,
          sector: filterSector || undefined,
          skill: filterSkill || undefined,
          city: filterCity || undefined,
          available_only: filterAvailableOnly || undefined,
        });
        if (isMounted) {
          setMembers(res.results || []);
          setTotalCount(res.count || 0);
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        if (isMounted) setIsSearchLoading(false);
      }
    }
    fetchResults();
    return () => { isMounted = false; };
  }, [activeDoor, selectedIntent, searchTerm, filterSector, filterSkill, filterCity, filterAvailableOnly]);

  // Chargement Porte 2 (Besoins & Demandes de mise en relation)
  const reloadNeedsAndRequests = async () => {
    setIsNeedsLoading(true);
    try {
      const [needsData, reqsData] = await Promise.all([
        fetchMemberNeeds(),
        fetchConnectionRequests(),
      ]);
      setNeeds(needsData);
      setConnectionRequests(reqsData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsNeedsLoading(false);
    }
  };

  useEffect(() => {
    if (activeDoor === 'needs') {
      reloadNeedsAndRequests();
    }
  }, [activeDoor]);

  // Chargement Porte 3 (Mon profil d'aidant)
  const reloadMyHelpProfile = async () => {
    const memberId = user?.member_id;
    if (!memberId) return;
    setIsHelpLoading(true);
    try {
      const [avail, skills, services] = await Promise.all([
        getMemberAvailability(memberId),
        getMemberSkills(memberId),
        getMemberServices(memberId),
      ]);
      setMyAvailability(avail || {
        member: memberId,
        status: 'AVAILABLE',
        open_for_mentoring: true,
        open_for_dahirah_events: true,
        open_for_pro_help: true,
        open_for_volunteer: true,
        weekly_hours_available: 2,
      });
      setMySkills(skills);
      setMyServices(services);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsHelpLoading(false);
    }
  };

  useEffect(() => {
    if (activeDoor === 'help') {
      reloadMyHelpProfile();
    }
  }, [activeDoor, user?.member_id]);

  // Actions Porte 1 : Filtres
  const updateFilter = (key: string, value: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value);
    else p.delete(key);
    setSearchParams(p);
  };

  // Actions Porte 2 : Création de besoin
  const handleCreateNeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNeedTitle.trim() || !newNeedDesc.trim()) return;
    const memberId = user?.member_id;
    if (!memberId) {
      showToast('Votre compte utilisateur doit être rattaché à une fiche membre.', 'error');
      return;
    }

    try {
      const res = await createMemberNeed({
        member: memberId,
        title: newNeedTitle.trim(),
        need_type: newNeedType,
        description: newNeedDesc.trim(),
        urgency_level: newNeedUrgency,
        is_anonymous: newNeedAnonymous,
      });
      if (res) {
        showToast('Votre besoin d’entraide a été formulé avec succès.');
        setIsNewNeedModalOpen(false);
        setNewNeedTitle('');
        setNewNeedDesc('');
        reloadNeedsAndRequests();
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création du besoin.', 'error');
    }
  };

  // Actions Porte 2 : Ouvrir suggestions avec motifs explicatifs
  const handleOpenMatches = async (need: MemberNeedDTO) => {
    setMatchingNeed(need);
    setNeedMatches([]);
    setIsMatchesLoading(true);
    setConnectingTargetId(null);
    setConnectMessage('');
    try {
      const matches = await fetchNeedMatches(need.id);
      setNeedMatches(matches);
    } catch (err: any) {
      showToast('Erreur lors du calcul des correspondances.', 'error');
    } finally {
      setIsMatchesLoading(false);
    }
  };

  // Actions Porte 2 : Émettre une demande de mise en relation
  const handleSendConnectionRequest = async (targetMemberId: string) => {
    if (!matchingNeed) return;
    try {
      await createConnectionRequest({
        need: matchingNeed.id,
        target_member: targetMemberId,
        message: connectMessage || `Demande fraternelle concernant le besoin : ${matchingNeed.title}`,
      });
      showToast('Demande de mise en relation transmise avec bienveillance.');
      setConnectingTargetId(null);
      setConnectMessage('');
      setMatchingNeed(null);
      reloadNeedsAndRequests();
    } catch (err: any) {
      showToast(err.message || 'Impossible d’envoyer cette demande.', 'error');
    }
  };

  // Actions Porte 2 : Accepter ou décliner
  const handleAcceptRequest = async (reqId: string) => {
    try {
      await acceptConnectionRequest(reqId);
      showToast('Demande acceptée ! L’accompagnement confraternel est désormais actif.');
      reloadNeedsAndRequests();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’acceptation.', 'error');
    }
  };

  const handleDeclineRequest = async (reqId: string) => {
    try {
      await declineConnectionRequest(reqId);
      showToast('Demande déclinée avec courtoisie.');
      reloadNeedsAndRequests();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du refus.', 'error');
    }
  };

  const handleResolveNeed = async (needId: string) => {
    try {
      await resolveMemberNeed(needId);
      showToast('Alhamdulillah ! Ce besoin d’entraide a été marqué comme pourvu.');
      reloadNeedsAndRequests();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la résolution.', 'error');
    }
  };

  // Actions Porte 1 : Sollicitation directe
  const handleSendDirectConnect = async () => {
    if (!directConnectTarget) return;
    try {
      await createConnectionRequest({
        target_member: directConnectTarget.id,
        message: directConnectMessage || 'As-salamu alaykum, je souhaiterais échanger avec vous.',
      });
      showToast('Demande de mise en relation directe envoyée.');
      setDirectConnectTarget(null);
      setDirectConnectMessage('');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’envoi de la demande.', 'error');
    }
  };

  // Actions Porte 3 : Sauvegarde disponibilité
  const handleSaveAvailability = async () => {
    if (!myAvailability) return;
    try {
      await saveMemberAvailability(myAvailability.id, myAvailability);
      showToast('Disponibilité confraternelle mise à jour avec succès.');
    } catch (err: any) {
      showToast(err.message || 'Erreur de mise à jour.', 'error');
    }
  };

  // Actions Porte 3 : Ajout compétence
  const handleAddSkill = async () => {
    const memberId = user?.member_id;
    if (!memberId || !newSkillId) return;
    try {
      await addMemberSkill({
        member: memberId,
        skill: newSkillId,
        level: newSkillLevel,
      });
      showToast('Compétence ajoutée à votre profil.');
      setNewSkillId('');
      reloadMyHelpProfile();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de l’ajout.', 'error');
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await deleteMemberSkill(id);
      showToast('Compétence retirée.');
      reloadMyHelpProfile();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du retrait.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 transition-all ${
          toastMessage.type === 'success'
            ? 'bg-[#12231c] border-emerald-500/50 text-emerald-200'
            : 'bg-[#291414] border-red-500/50 text-red-200'
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {toastMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-xs font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* En-tête Institutionnel du Carrefour d'Entraide */}
      <section className="relative rounded-2xl bg-gradient-to-r from-[#0d131d] via-[#131b26] to-[#0f1622] p-6 lg:p-7 border border-[#2b3547]/80 shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f2ca50]/70 to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f2ca50]/10 border border-[#f2ca50]/20 text-[#f2ca50] text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50] animate-pulse"></span>
                Espace Confraternel &amp; Synergie V1.2.3
              </span>
            </div>
            <h1 className="font-headline-lg text-2xl lg:text-3xl font-medium tracking-tight text-[#e5e9f2] flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#f2ca50] text-[30px]">hub</span>
              Carrefour d'Entraide &amp; Réseau Confraternel
            </h1>
            <p className="text-xs text-[#9ca7b8] max-w-2xl">
              Mettez en commun les savoirs, expertises et compétences des disciples de la Dahirah.
              Recherchez des compétences, exprimez un besoin d'entraide ou proposez votre accompagnement fraternel.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1e2638] text-[#9ca7b8] hover:text-[#e5e9f2] text-xs font-semibold border border-[#2b3547] transition"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              <span>Baromètre Dashboard</span>
            </Link>
          </div>
        </div>

        {/* 🎯 Les 3 Portes d'Entrée Confraternelles Officielles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-6 mt-4 border-t border-[#2b3547]/60">
          <button
            onClick={() => handleSelectDoor('search')}
            className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all ${
              activeDoor === 'search'
                ? 'bg-[#1c2738] border-[#f2ca50] shadow-xl ring-1 ring-[#f2ca50]/50'
                : 'bg-[#111722]/80 border-[#2b3547]/80 hover:bg-[#151c28] hover:border-[#3b475e]'
            }`}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              activeDoor === 'search' ? 'bg-[#f2ca50] text-slate-950 font-bold' : 'bg-[#1e2738] text-[#f2ca50]'
            }`}>
              <span className="material-symbols-outlined text-[24px]">search</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#e5e9f2] flex items-center gap-1.5">
                <span>1. Je cherche</span>
                {activeDoor === 'search' && <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>}
              </div>
              <div className="text-[11px] text-[#9ca7b8]">Compétences, métiers, services, mentorat</div>
            </div>
          </button>

          <button
            onClick={() => handleSelectDoor('needs')}
            className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all ${
              activeDoor === 'needs'
                ? 'bg-[#1c2738] border-[#f2ca50] shadow-xl ring-1 ring-[#f2ca50]/50'
                : 'bg-[#111722]/80 border-[#2b3547]/80 hover:bg-[#151c28] hover:border-[#3b475e]'
            }`}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              activeDoor === 'needs' ? 'bg-[#f2ca50] text-slate-950 font-bold' : 'bg-[#1e2738] text-amber-400'
            }`}>
              <span className="material-symbols-outlined text-[24px]">front_hand</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#e5e9f2] flex items-center gap-1.5">
                <span>2. J'ai besoin d'aide</span>
                {activeDoor === 'needs' && <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>}
              </div>
              <div className="text-[11px] text-[#9ca7b8]">Besoins d'entraide &amp; mises en relation</div>
            </div>
          </button>

          <button
            onClick={() => handleSelectDoor('help')}
            className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all ${
              activeDoor === 'help'
                ? 'bg-[#1c2738] border-[#f2ca50] shadow-xl ring-1 ring-[#f2ca50]/50'
                : 'bg-[#111722]/80 border-[#2b3547]/80 hover:bg-[#151c28] hover:border-[#3b475e]'
            }`}
          >
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
              activeDoor === 'help' ? 'bg-[#f2ca50] text-slate-950 font-bold' : 'bg-[#1e2738] text-emerald-400'
            }`}>
              <span className="material-symbols-outlined text-[24px]">lightbulb</span>
            </div>
            <div>
              <div className="text-sm font-bold text-[#e5e9f2] flex items-center gap-1.5">
                <span>3. Je peux aider</span>
                {activeDoor === 'help' && <span className="w-1.5 h-1.5 rounded-full bg-[#f2ca50]"></span>}
              </div>
              <div className="text-[11px] text-[#9ca7b8]">Déclarer compétences &amp; disponibilités</div>
            </div>
          </button>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* PORTE 1 : JE CHERCHE (ANNUAIRE INTENTIONNEL DÉTERMINISTE)             */}
      {/* ==================================================================== */}
      {activeDoor === 'search' && (
        <div className="space-y-6">
          
          {/* Bloc de filtres multicritère déterministe */}
          <div className="p-5 rounded-2xl bg-[#111722] border border-[#2b3547]/80 shadow-xl space-y-4">
            
            {/* Ligne Intentionnelle : Que recherchez-vous ? */}
            <div>
              <label className="text-[11px] font-bold text-[#9ca7b8] uppercase tracking-wider block mb-2">
                Que recherchez-vous en priorité ?
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: '', label: 'Tous les profils', icon: 'groups' },
                  { id: 'MENTORSHIP', label: 'Mentorat & Partage', icon: 'school' },
                  { id: 'SERVICE', label: 'Prestations & Services Dahirah', icon: 'handshake' },
                  { id: 'PRO_HELP', label: 'Conseil & Entraide Pro', icon: 'lightbulb' },
                  { id: 'JOB_INTERNSHIP', label: 'Emploi & Stages', icon: 'work' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateFilter('intent', item.id || null)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                      selectedIntent === item.id
                        ? 'bg-[#f2ca50] text-slate-950 border-[#f2ca50] font-bold shadow-md'
                        : 'bg-[#17202f] border-[#2b3547] text-[#9ca7b8] hover:text-[#e5e9f2] hover:bg-[#1d273a]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ligne Filtres combinables : Mot-clé, Secteur, Ville, Disponible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-[#2b3547]/50">
              
              {/* Mot-clé */}
              <div className="md:col-span-1">
                <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Recherche textuelle</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#f2ca50] text-[18px]">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => updateFilter('search', e.target.value || null)}
                    placeholder="Compétence, métier, nom..."
                    className="w-full bg-[#080d14] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl pl-9 pr-3 py-2 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
                  />
                </div>
              </div>

              {/* Secteur */}
              <div>
                <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Secteur d'activité</label>
                <select
                  value={filterSector}
                  onChange={(e) => updateFilter('sector', e.target.value || null)}
                  className="w-full bg-[#080d14] text-[#e5e9f2] text-xs rounded-xl p-2 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
                >
                  <option value="">Tous secteurs</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Ville */}
              <div>
                <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Ville / Résidence</label>
                <input
                  type="text"
                  value={filterCity}
                  onChange={(e) => updateFilter('city', e.target.value || null)}
                  placeholder="Ex: Dakar, Thiès..."
                  className="w-full bg-[#080d14] text-[#e5e9f2] placeholder-[#788294] text-xs rounded-xl p-2 border border-[#2b3547] focus:border-[#f2ca50] outline-none"
                />
              </div>

              {/* Toggle Disponible uniquement */}
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => updateFilter('available_only', filterAvailableOnly ? null : 'true')}
                  className={`w-full p-2 rounded-xl text-xs font-semibold border transition flex items-center justify-center gap-2 ${
                    filterAvailableOnly
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                      : 'bg-[#080d14] border-[#2b3547] text-[#9ca7b8] hover:text-[#e5e9f2]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Disponible uniquement</span>
                </button>
              </div>

            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2b3547]/40 text-xs text-[#9ca7b8]">
              <span>
                <strong className="text-[#f2ca50]">{totalCount}</strong> membre{totalCount > 1 ? 's' : ''} correspondant{totalCount > 1 ? 's' : ''}
              </span>
              {(selectedIntent || searchTerm || filterSector || filterCity || filterAvailableOnly) && (
                <button
                  onClick={() => setSearchParams(new URLSearchParams({ tab: 'search' }))}
                  className="text-red-400 hover:text-red-300 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>

          </div>

          {/* Grille des membres */}
          {isSearchLoading ? (
            <div className="p-12 text-center text-[#9ca7b8] text-xs">
              <span className="material-symbols-outlined text-[32px] animate-spin text-[#f2ca50] block mb-2">progress_activity</span>
              Recherche dans le réseau confraternel...
            </div>
          ) : members.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111722]/80 border border-[#2b3547] text-center space-y-2">
              <span className="material-symbols-outlined text-[#9ca7b8] text-[40px]">person_search</span>
              <div className="text-sm font-semibold text-[#e5e9f2]">Aucun profil ne correspond à ces critères</div>
              <p className="text-xs text-[#9ca7b8]">Essayez d'élargir votre recherche ou explorez tous les secteurs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-2xl bg-[#131b26] border border-[#2b3547]/80 hover:border-[#f2ca50]/50 p-5 flex flex-col justify-between transition-all shadow-lg hover:shadow-2xl space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Carte : Matricule & Disponibilité */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#1b2536] border border-[#2b3547] text-[#9ca7b8] text-[10px] font-mono font-bold">
                        {m.matricule}
                      </span>
                      {m.availability_status === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Disponible
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#9ca7b8]">
                          {m.city || 'Dakar'}
                        </span>
                      )}
                    </div>

                    {/* Identité & Métier */}
                    <div>
                      <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">
                        {m.display_name}
                      </h3>
                      <div className="text-xs text-[#f2ca50] font-medium mt-0.5">
                        {m.primary_profession || 'Membre de la Dahirah'}
                      </div>
                      {m.primary_organization && (
                        <div className="text-[11px] text-[#9ca7b8]">
                          {m.primary_organization}
                        </div>
                      )}
                    </div>

                    {/* Compétences en badges */}
                    {m.skills && m.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {m.skills.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded-md bg-[#1d2738] border border-[#2b3547]/80 text-[#bfcfed] text-[10px]"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Badges d'engagement fraternel */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.open_for_mentoring && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 text-[10px]">
                          <span className="material-symbols-outlined text-[12px]">school</span>
                          Mentorat
                        </span>
                      )}
                      {m.open_for_pro_help && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 text-[10px]">
                          <span className="material-symbols-outlined text-[12px]">lightbulb</span>
                          Entraide Pro
                        </span>
                      )}
                      {m.services_count > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px]">
                          <span className="material-symbols-outlined text-[12px]">handshake</span>
                          {m.services_count} service{m.services_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions de contact & Fiche 360° */}
                  <div className="pt-3 border-t border-[#2b3547]/50 flex items-center justify-between gap-2">
                    <Link
                      to={`/members/${m.matricule}`}
                      className="text-xs text-[#9ca7b8] hover:text-[#e5e9f2] font-semibold flex items-center gap-1"
                    >
                      <span>Fiche 360°</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>

                    <button
                      onClick={() => {
                        setDirectConnectTarget(m);
                        setDirectConnectMessage('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#242e40] text-[#f2ca50] hover:bg-[#2e3b52] text-xs font-semibold border border-[#f2ca50]/30 flex items-center gap-1.5 transition shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">forward_to_inbox</span>
                      <span>Solliciter mise en relation</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PORTE 2 : J'AI BESOIN D'AIDE (CARREFOUR DES BESOINS & MISES EN RELATION) */}
      {/* ==================================================================== */}
      {activeDoor === 'needs' && (
        <div className="space-y-6">
          
          {/* Header Action : Exprimer un besoin */}
          <div className="p-5 rounded-2xl bg-[#111722] border border-[#2b3547]/80 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-headline-sm text-lg font-bold text-[#e5e9f2] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f2ca50] text-[22px]">handshake</span>
                Besoins d'Entraide Communautaires
              </h2>
              <p className="text-xs text-[#9ca7b8]">
                Exprimez vos besoins professionnels, académiques ou confraternels. L'entraide est protégée par un anonymat relatif.
              </p>
            </div>

            <button
              onClick={() => setIsNewNeedModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f2ca50] text-slate-950 hover:bg-[#e9c349] text-xs font-bold transition shadow-md shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Exprimer un besoin d'entraide</span>
            </button>
          </div>

          {/* Section A : Mises en relation en cours (Reçues & Envoyées) */}
          {connectionRequests.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#131b26] border border-[#2b3547]/80 shadow-lg space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9ca7b8] flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-[18px]">connect_without_contact</span>
                Vos Demandes de Mise en Relation ({connectionRequests.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {connectionRequests.map((req) => {
                  const isIncoming = req.target_member === user?.member_id;
                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl bg-[#182232] border border-[#2b3547] flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'ACCEPTED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : req.status === 'DECLINED'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {req.status_display}
                          </span>
                          <span className="text-[10px] text-[#9ca7b8]">
                            {new Date(req.created_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>

                        <div className="text-sm font-semibold text-[#e5e9f2]">
                          {req.need_title ? `Besoin : ${req.need_title}` : 'Sollicitation directe'}
                        </div>

                        <div className="text-[11px] text-[#9ca7b8]">
                          {isIncoming ? (
                            <span>Demandeur : <strong className="text-[#f2ca50]">{req.requester_name}</strong></span>
                          ) : (
                            <span>Sollicité : <strong className="text-[#f2ca50]">{req.target_member_name}</strong></span>
                          )}
                        </div>

                        {req.message && (
                          <div className="p-2 rounded-lg bg-[#0d141f] text-[11px] text-[#bfcfed] italic">
                            "{req.message}"
                          </div>
                        )}
                      </div>

                      {/* Boutons d'action pour le membre sollicité */}
                      {isIncoming && req.status === 'PENDING' && (
                        <div className="pt-2 border-t border-[#2b3547]/60 flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition"
                          >
                            Accepter l'accompagnement
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#242e40] text-red-300 hover:bg-red-950/40 text-xs transition"
                          >
                            Décliner
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section B : Liste des besoins d'entraide */}
          {isNeedsLoading ? (
            <div className="p-12 text-center text-[#9ca7b8] text-xs">
              <span className="material-symbols-outlined text-[32px] animate-spin text-[#f2ca50] block mb-2">progress_activity</span>
              Chargement des besoins d'entraide...
            </div>
          ) : needs.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#111722]/80 border border-[#2b3547] text-center space-y-2">
              <span className="material-symbols-outlined text-[#9ca7b8] text-[40px]">volunteer_activism</span>
              <div className="text-sm font-semibold text-[#e5e9f2]">Aucun besoin d'entraide enregistré</div>
              <p className="text-xs text-[#9ca7b8]">Soyez le premier à exprimer un besoin d'accompagnement ou de conseil.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {needs.map((need) => (
                <div
                  key={need.id}
                  className="p-5 rounded-2xl bg-[#131b26] border border-[#2b3547]/80 hover:border-[#f2ca50]/40 transition shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f2ca50]/15 text-[#f2ca50] text-[10px] font-bold">
                        {need.need_type_display || need.need_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        need.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : need.status === 'IN_PROGRESS'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {need.status_display || need.status}
                      </span>
                      {need.urgency_level === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                          Urgent
                        </span>
                      )}
                      <span className="text-[11px] text-[#9ca7b8]">
                        Demandeur : <strong className="text-[#e5e9f2]">{need.member_name}</strong>
                      </span>
                    </div>

                    <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">
                      {need.title}
                    </h3>
                    <p className="text-xs text-[#9ca7b8] leading-relaxed">
                      {need.description}
                    </p>
                  </div>

                  {/* Actions sur le besoin */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {need.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleOpenMatches(need)}
                        className="px-3.5 py-2 rounded-xl bg-[#242e40] text-[#f2ca50] hover:bg-[#2b3547] text-xs font-bold border border-[#f2ca50]/30 flex items-center gap-1.5 transition shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                        <span>Profils suggérés</span>
                      </button>
                    )}

                    {need.status !== 'RESOLVED' && (user?.is_superuser || need.member === user?.member_id) && (
                      <button
                        onClick={() => handleResolveNeed(need.id)}
                        className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Résolu</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ==================================================================== */}
      {/* PORTE 3 : JE PEUX AIDER (DISPONIBILITÉ & OFFRES DU MEMBRE)            */}
      {/* ==================================================================== */}
      {activeDoor === 'help' && (
        <div className="space-y-6">
          
          {/* Section 1 : Ma Disponibilité Confraternelle */}
          <div className="p-6 rounded-2xl bg-[#111722] border border-[#2b3547]/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="font-headline-sm text-lg font-bold text-[#e5e9f2] flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-[22px]">event_available</span>
                  Votre Statut de Disponibilité
                </h2>
                <p className="text-xs text-[#9ca7b8]">
                  Indiquez à la Dahirah si vous êtes disponible pour accompagner vos frères et sœurs.
                </p>
              </div>

              <button
                onClick={handleSaveAvailability}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition shadow-md"
              >
                Enregistrer disponibilité
              </button>
            </div>

            {myAvailability && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Statut global</label>
                  <select
                    value={myAvailability.status}
                    onChange={(e) => setMyAvailability({ ...myAvailability, status: e.target.value as any })}
                    className="w-full bg-[#080d14] text-[#e5e9f2] text-xs rounded-xl p-2.5 border border-[#2b3547] outline-none"
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="LIMITED">Disponibilité limitée</option>
                    <option value="BUSY">Occupé actuellement</option>
                    <option value="UNAVAILABLE">Non disponible</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#9ca7b8] font-bold uppercase tracking-wider block mb-1">Volume hebdo (heures)</label>
                  <input
                    type="number"
                    value={myAvailability.weekly_hours_available ?? 2}
                    onChange={(e) => setMyAvailability({ ...myAvailability, weekly_hours_available: Number(e.target.value) })}
                    className="w-full bg-[#080d14] text-[#e5e9f2] text-xs rounded-xl p-2 border border-[#2b3547] outline-none"
                    min={0}
                    max={40}
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="mentoring_check"
                    checked={myAvailability.open_for_mentoring}
                    onChange={(e) => setMyAvailability({ ...myAvailability, open_for_mentoring: e.target.checked })}
                    className="rounded border-[#2b3547] text-[#f2ca50] focus:ring-[#f2ca50]"
                  />
                  <label htmlFor="mentoring_check" className="text-xs font-semibold text-[#e5e9f2]">
                    Volontaire pour mentorat
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <input
                    type="checkbox"
                    id="pro_help_check"
                    checked={myAvailability.open_for_pro_help}
                    onChange={(e) => setMyAvailability({ ...myAvailability, open_for_pro_help: e.target.checked })}
                    className="rounded border-[#2b3547] text-[#f2ca50] focus:ring-[#f2ca50]"
                  />
                  <label htmlFor="pro_help_check" className="text-xs font-semibold text-[#e5e9f2]">
                    Ouvert au conseil pro
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Section 2 : Mes Compétences Déclarées */}
          <div className="p-6 rounded-2xl bg-[#111722] border border-[#2b3547]/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="font-headline-sm text-base font-bold text-[#e5e9f2] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#f2ca50] text-[20px]">psychology</span>
                  Vos Compétences Renseignées
                </h2>
                <p className="text-xs text-[#9ca7b8]">
                  Permet au moteur d'appariement de vous proposer automatiquement aux demandes d'aide.
                </p>
              </div>
            </div>

            {/* Formulaire ajout compétence */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#0b1019] border border-[#2b3547]">
              <select
                value={newSkillId}
                onChange={(e) => setNewSkillId(e.target.value)}
                className="flex-1 min-w-[200px] bg-[#151c28] text-[#e5e9f2] text-xs rounded-xl p-2 border border-[#2b3547] outline-none"
              >
                <option value="">Sélectionner une compétence à déclarer...</option>
                {skillsList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category_name})</option>
                ))}
              </select>

              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                className="bg-[#151c28] text-[#e5e9f2] text-xs rounded-xl p-2 border border-[#2b3547] outline-none"
              >
                <option value="BEGINNER">Débutant</option>
                <option value="INTERMEDIATE">Intermédiaire</option>
                <option value="ADVANCED">Confirmé</option>
                <option value="EXPERT">Expert</option>
              </select>

              <button
                onClick={handleAddSkill}
                disabled={!newSkillId}
                className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold hover:bg-[#e9c349] disabled:opacity-50 text-xs transition"
              >
                Ajouter compétence
              </button>
            </div>

            {/* Liste de mes compétences */}
            <div className="flex flex-wrap gap-2 pt-2">
              {mySkills.length === 0 ? (
                <div className="text-xs text-[#9ca7b8] italic">Aucune compétence ajoutée pour l'instant.</div>
              ) : (
                mySkills.map((ms) => (
                  <div
                    key={ms.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#17202f] border border-[#2b3547] text-xs"
                  >
                    <span className="font-semibold text-[#e5e9f2]">{ms.skill_name}</span>
                    <span className="text-[10px] text-[#9ca7b8]">({ms.level_display})</span>
                    {ms.is_verified && (
                      <span className="material-symbols-outlined text-emerald-400 text-[14px]">verified</span>
                    )}
                    <button
                      onClick={() => handleDeleteSkill(ms.id)}
                      className="text-[#9ca7b8] hover:text-red-400 ml-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : NOUVEAU BESOIN D'ENTRAIDE                                    */}
      {/* ==================================================================== */}
      {isNewNeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121926] border border-[#2b3547] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b3547] pb-3">
              <h3 className="font-headline-sm text-lg font-bold text-[#e5e9f2] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#f2ca50]">volunteer_activism</span>
                Exprimer un Besoin d'Entraide
              </h3>
              <button
                onClick={() => setIsNewNeedModalOpen(false)}
                className="text-[#9ca7b8] hover:text-[#e5e9f2]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNeed} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#9ca7b8] uppercase mb-1">
                  Type d'entraide souhaitée
                </label>
                <select
                  value={newNeedType}
                  onChange={(e) => setNewNeedType(e.target.value)}
                  className="w-full bg-[#080d14] text-[#e5e9f2] rounded-xl p-2.5 border border-[#2b3547] outline-none"
                >
                  <option value="MENTORSHIP">Recherche de mentorat</option>
                  <option value="PRO_SERVICE">Prestation / Artisan de confiance</option>
                  <option value="LEGAL_ADMIN">Conseil juridique ou administratif</option>
                  <option value="ACADEMIC">Aide scolaire &amp; universitaire</option>
                  <option value="COMMUNITY_AID">Entraide fraternelle</option>
                  <option value="JOB_SEARCH">Recherche d'emploi</option>
                  <option value="INTERNSHIP">Recherche de stage</option>
                  <option value="OTHER">Autre besoin</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#9ca7b8] uppercase mb-1">
                  Intitulé clair de votre demande
                </label>
                <input
                  type="text"
                  value={newNeedTitle}
                  onChange={(e) => setNewNeedTitle(e.target.value)}
                  placeholder="Ex: Recherche relecture contrat, stage en finance..."
                  className="w-full bg-[#080d14] text-[#e5e9f2] rounded-xl p-2.5 border border-[#2b3547] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#9ca7b8] uppercase mb-1">
                  Détails &amp; Contexte
                </label>
                <textarea
                  value={newNeedDesc}
                  onChange={(e) => setNewNeedDesc(e.target.value)}
                  rows={4}
                  placeholder="Expliquez votre situation avec bienveillance et précision..."
                  className="w-full bg-[#080d14] text-[#e5e9f2] rounded-xl p-2.5 border border-[#2b3547] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#9ca7b8] uppercase mb-1">Degré d'urgence</label>
                  <select
                    value={newNeedUrgency}
                    onChange={(e) => setNewNeedUrgency(e.target.value as any)}
                    className="w-full bg-[#080d14] text-[#e5e9f2] rounded-xl p-2.5 border border-[#2b3547] outline-none"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Prioritaire</option>
                    <option value="CRITICAL">Urgent</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="need_anon"
                    checked={newNeedAnonymous}
                    onChange={(e) => setNewNeedAnonymous(e.target.checked)}
                    className="rounded border-[#2b3547] text-[#f2ca50] focus:ring-[#f2ca50]"
                  />
                  <label htmlFor="need_anon" className="text-xs text-[#9ca7b8]">
                    Anonymat auprès des pairs
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2b3547] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewNeedModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1e2638] text-[#9ca7b8] hover:text-[#e5e9f2]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold hover:bg-[#e9c349] transition shadow-md"
                >
                  Formuler le besoin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : MATCHING EXPLICABLE & MISE EN RELATION DÉTERMINISTE           */}
      {/* ==================================================================== */}
      {matchingNeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121926] border border-[#2b3547] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#2b3547] pb-3">
              <div>
                <span className="text-[10px] text-[#f2ca50] font-bold uppercase">Moteur d'Appariement Confraternel</span>
                <h3 className="font-headline-sm text-base font-bold text-[#e5e9f2]">
                  Suggestions pour : "{matchingNeed.title}"
                </h3>
              </div>
              <button
                onClick={() => setMatchingNeed(null)}
                className="text-[#9ca7b8] hover:text-[#e5e9f2]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {isMatchesLoading ? (
              <div className="p-8 text-center text-[#9ca7b8] text-xs">
                <span className="material-symbols-outlined text-[28px] animate-spin text-[#f2ca50] block mb-2">progress_activity</span>
                Calcul déterministe des correspondances...
              </div>
            ) : needMatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9ca7b8] space-y-1">
                <span className="material-symbols-outlined text-[32px] text-[#9ca7b8] block mb-1">sentiment_dissatisfied</span>
                <p>Aucun profil correspondant exact détecté pour l'instant.</p>
                <p className="text-[10px]">Un administrateur de la Dahirah examinera cette demande pour faciliter une orientation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[#9ca7b8]">
                  Voici les disciples recommandés sur la base de leurs compétences certifiées, métiers et disponibilités :
                </p>

                {needMatches.map((cand) => (
                  <div
                    key={cand.member_id}
                    className="p-4 rounded-xl bg-[#17202f] border border-[#2b3547] flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#e5e9f2] flex items-center gap-1.5">
                          <span>{cand.display_name}</span>
                          <span className="text-[10px] text-[#9ca7b8] font-mono">({cand.matricule})</span>
                        </div>
                        <div className="text-[11px] text-[#f2ca50]">
                          {cand.primary_profession || 'Membre Dahirah'} • {cand.city}
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold font-mono">
                        Affinité : {cand.score} pts
                      </span>
                    </div>

                    {/* Motifs explicatifs transparents */}
                    <div className="flex flex-wrap gap-1.5">
                      {cand.match_reasons.map((r, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#242e40] border border-[#2b3547] text-[10px] text-[#bfcfed] flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px] text-emerald-400">check</span>
                          <span>{r}</span>
                        </span>
                      ))}
                    </div>

                    {/* Bloc Solliciter */}
                    {connectingTargetId === cand.member_id ? (
                      <div className="pt-2 border-t border-[#2b3547] space-y-2">
                        <input
                          type="text"
                          value={connectMessage}
                          onChange={(e) => setConnectMessage(e.target.value)}
                          placeholder="Message d'accompagnement ou précisions..."
                          className="w-full bg-[#090d14] text-[#e5e9f2] text-xs rounded-xl p-2 border border-[#2b3547] outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setConnectingTargetId(null)}
                            className="px-3 py-1.5 rounded-lg bg-[#242e40] text-[#9ca7b8] text-xs"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleSendConnectionRequest(cand.member_id)}
                            className="px-3 py-1.5 rounded-lg bg-[#f2ca50] text-slate-950 font-bold text-xs"
                          >
                            Envoyer la demande
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => {
                            setConnectingTargetId(cand.member_id);
                            setConnectMessage(`As-salamu alaykum, je sollicite votre accompagnement concernant mon besoin : "${matchingNeed.title}".`);
                          }}
                          className="px-3 py-1 rounded-lg bg-[#242e40] text-[#f2ca50] hover:bg-[#2b3547] text-xs font-semibold border border-[#f2ca50]/30 transition"
                        >
                          Proposer une mise en relation
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL : SOLLICITATION DIRECTE (DEPUIS PORTE 1)                       */}
      {/* ==================================================================== */}
      {directConnectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121926] border border-[#2b3547] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2b3547] pb-3">
              <h3 className="font-headline-sm text-sm font-bold text-[#e5e9f2]">
                Solliciter : {directConnectTarget.display_name}
              </h3>
              <button
                onClick={() => setDirectConnectTarget(null)}
                className="text-[#9ca7b8] hover:text-[#e5e9f2]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#9ca7b8]">
                Rédigez un court message fraternel pour solliciter un échange, du mentorat ou un conseil.
              </p>

              <textarea
                value={directConnectMessage}
                onChange={(e) => setDirectConnectMessage(e.target.value)}
                rows={3}
                placeholder="As-salamu alaykum, je souhaiterais échanger avec vous au sujet de..."
                className="w-full bg-[#080d14] text-[#e5e9f2] rounded-xl p-2.5 border border-[#2b3547] outline-none"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDirectConnectTarget(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#1e2638] text-[#9ca7b8]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendDirectConnect}
                  className="px-4 py-2 rounded-xl bg-[#f2ca50] text-slate-950 font-bold hover:bg-[#e9c349] transition shadow-md"
                >
                  Transmettre la demande
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
